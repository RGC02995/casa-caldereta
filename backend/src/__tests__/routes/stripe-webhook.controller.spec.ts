import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Request, Response } from 'express';

// Stripe: constructEvent devuelve el evento tal cual (sin verificar firma), y refunds.create espiado.
vi.mock('../../config/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    refunds:  { create: vi.fn().mockResolvedValue({ id: 're_1' }) },
  },
}));

vi.mock('../../config/environment', () => ({
  env: { stripeWebhookSecret: 'whsec_test', frontendUrl: 'https://casa-caldereta.com' },
}));

vi.mock('../../services/booking.service', () => ({
  bookingService: {
    confirmDepositPayment:      vi.fn(),
    confirmRemainingFromStripe: vi.fn(),
  },
}));

vi.mock('../../services/email.service', () => ({
  emailService: {
    notifyOwnerPaymentReceived:  vi.fn(),
    sendGuestPaymentConfirmed:   vi.fn(),
    sendGuestRefundCancellation: vi.fn(),
    notifyOwnerAutoRefund:       vi.fn(),
  },
}));

vi.mock('../../services/checkin.service', () => ({
  checkinService: { handleWebhookPostConfirmation: vi.fn() },
}));

vi.mock('../../utils/invoice.util', () => ({ buildInvoiceUrl: vi.fn(() => 'https://inv') }));

import { stripeWebhookHandler } from '../../controllers/stripe-webhook.controller';
import { stripe } from '../../config/stripe';
import { bookingService } from '../../services/booking.service';
import { emailService } from '../../services/email.service';

const constructEventMock = stripe.webhooks.constructEvent as unknown as Mock;
const refundCreateMock   = stripe.refunds.create as unknown as Mock;
const confirmDepositMock = bookingService.confirmDepositPayment as unknown as Mock;

function depositEvent(): unknown {
  return {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_1', payment_status: 'paid', payment_intent: 'pi_1', metadata: { type: 'deposit' } } },
  };
}

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(): Request {
  return { headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') } as unknown as Request;
}

const sampleBooking = {
  _id: '1', guestName: 'Ana', guestEmail: 'ana@example.com', guestPhone: '+34600',
  checkIn: new Date('2026-08-10'), checkOut: new Date('2026-08-13'),
  depositAmount: 150, remainingAmount: 150, totalPrice: 300,
};

describe('stripeWebhookHandler — depósito defensivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    constructEventMock.mockReturnValue(depositEvent());
    refundCreateMock.mockResolvedValue({ id: 're_1' });
  });

  it('confirmed → confirma y NO reembolsa', async () => {
    confirmDepositMock.mockResolvedValue({ outcome: 'confirmed', booking: sampleBooking });
    const res = mockRes();
    await stripeWebhookHandler(mockReq(), res);

    expect(refundCreateMock).not.toHaveBeenCalled();
    expect(emailService.sendGuestPaymentConfirmed).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('conflict → reembolsa y avisa al huésped y al propietario', async () => {
    confirmDepositMock.mockResolvedValue({ outcome: 'conflict', booking: sampleBooking });
    const res = mockRes();
    await stripeWebhookHandler(mockReq(), res);

    expect(refundCreateMock).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    expect(emailService.sendGuestRefundCancellation).toHaveBeenCalledWith(sampleBooking, 150);
    expect(emailService.notifyOwnerAutoRefund).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('not_found → reembolsa defensivamente el pago recién cobrado', async () => {
    confirmDepositMock.mockResolvedValue({ outcome: 'not_found' });
    const res = mockRes();
    await stripeWebhookHandler(mockReq(), res);

    expect(refundCreateMock).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('already_confirmed → NO reenvía emails ni reembolsa (idempotente)', async () => {
    confirmDepositMock.mockResolvedValue({ outcome: 'already_confirmed', booking: sampleBooking });
    const res = mockRes();
    await stripeWebhookHandler(mockReq(), res);

    expect(refundCreateMock).not.toHaveBeenCalled();
    expect(emailService.sendGuestPaymentConfirmed).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
