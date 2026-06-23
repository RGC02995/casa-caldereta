import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { env } from '../config/environment';
import { bookingService } from '../services/booking.service';
import { emailService } from '../services/email.service';
import { buildInvoiceUrl } from '../utils/invoice.util';
import { checkinService } from '../services/checkin.service';

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    res.status(400).json({ success: false, message: 'Falta la firma de Stripe' });
    return;
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.stripeWebhookSecret,
    );
  } catch {
    res.status(400).json({ success: false, message: 'Firma de webhook inválida' });
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true });
    return;
  }

  const session = event.data.object;

  if ((session as { payment_status?: string }).payment_status !== 'paid') {
    res.status(200).json({ received: true });
    return;
  }

  const rawPaymentIntent = (session as { payment_intent?: string | { id: string } | null }).payment_intent ?? null;
  const paymentIntentId = typeof rawPaymentIntent === 'string'
    ? rawPaymentIntent
    : (rawPaymentIntent as { id: string } | null)?.id ?? '';

  const metadata = (session as { metadata?: Record<string, string> }).metadata ?? {};
  const paymentType = metadata['type'] ?? 'deposit';

  try {
    if (paymentType === 'remaining') {
      // Segundo pago — marcar pago restante como abonado
      const booking = await bookingService.confirmRemainingFromStripe(session.id, paymentIntentId);

      if (!booking) {
        console.warn(`[stripe-webhook] Sesión remaining sin reserva: ${session.id}`);
        res.status(200).json({ received: true });
        return;
      }

      const invoiceUrl = buildInvoiceUrl(String(booking._id));
      void emailService.notifyOwnerRemainingPaymentReceived(booking);
      void emailService.sendGuestRemainingPaymentConfirmed(booking, invoiceUrl);
      res.status(200).json({ received: true });
      return;
    }

    // Pago inicial (depósito) — confirmar reserva
    const booking = await bookingService.confirmFromStripe(session.id, paymentIntentId);

    if (!booking) {
      console.warn(`[stripe-webhook] Sesión sin reserva asociada: ${session.id}`);
      res.status(200).json({ received: true });
      return;
    }

    const invoiceUrl = buildInvoiceUrl(String(booking._id));
    void emailService.notifyOwnerPaymentReceived(booking);
    void emailService.sendGuestPaymentConfirmed(booking, invoiceUrl);
    void checkinService.handleWebhookPostConfirmation(booking);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error al procesar pago:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno al procesar el pago' });
  }
}
