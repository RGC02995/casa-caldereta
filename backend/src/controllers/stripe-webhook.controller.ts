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

    // Pago inicial (depósito) — confirmar reserva (defensivo ante pagos tardíos)
    const result = await bookingService.confirmDepositPayment(session.id, paymentIntentId);

    if (result.outcome === 'not_found') {
      // La reserva ya no existe (bloqueo de 10 min expirado + limpieza, o reintento del propio
      // usuario). El dinero se cobró igualmente → reembolso defensivo. Es un caso casi imposible
      // porque la limpieza expira la sesión de Stripe antes de borrar la reserva.
      console.warn(`[stripe-webhook] Depósito sin reserva asociada — reembolsando: ${session.id}`);
      if (paymentIntentId) {
        try {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        } catch (refundErr) {
          console.error('[stripe-webhook] Falló el reembolso defensivo (sin reserva):', refundErr);
        }
      }
      res.status(200).json({ received: true });
      return;
    }

    if (result.outcome === 'conflict') {
      // Las fechas se ocuparon por otra reserva entre liberar (10 min) y este pago tardío.
      // La reserva ya quedó marcada 'cancelled' en el servicio → reembolsar el depósito cobrado.
      const booking      = result.booking;
      const refundAmount = booking.depositAmount;
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        void emailService.sendGuestRefundCancellation(booking, refundAmount);
        void emailService.notifyOwnerAutoRefund(booking, refundAmount, 'Las fechas ya estaban ocupadas al confirmarse el pago.');
      } catch (refundErr) {
        console.error('[stripe-webhook] Falló el reembolso defensivo (conflicto):', refundErr);
        void emailService.notifyOwnerAutoRefund(booking, refundAmount, 'CONFLICTO DE FECHAS — el reembolso automático falló, revísalo en Stripe manualmente.');
      }
      res.status(200).json({ received: true });
      return;
    }

    // Reserva confirmada — enviar avisos solo en la confirmación real (no en reintentos idempotentes)
    const booking = result.booking;
    if (result.outcome === 'confirmed') {
      const invoiceUrl = buildInvoiceUrl(String(booking._id));
      void emailService.notifyOwnerPaymentReceived(booking);
      void emailService.sendGuestPaymentConfirmed(booking, invoiceUrl);
      void checkinService.handleWebhookPostConfirmation(booking);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error al procesar pago:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno al procesar el pago' });
  }
}
