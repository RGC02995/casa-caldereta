import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { env } from '../config/environment';
import { bookingService } from '../services/booking.service';
import { emailService } from '../services/email.service';

type CheckoutSession = {
  id:              string;
  payment_status:  string;
  payment_intent:  string | { id: string } | null;
};

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    res.status(400).json({ success: false, message: 'Falta la firma de Stripe' });
    return;
  }

  // constructEvent lanza StripeSignatureVerificationError si la firma no es válida
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

  // Solo procesamos el evento de pago completado
  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true });
    return;
  }

  const session = event.data.object as CheckoutSession;

  // Solo confirmamos si el pago fue cobrado efectivamente (no si quedó pendiente)
  if (session.payment_status !== 'paid') {
    res.status(200).json({ received: true });
    return;
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? '');

  try {
    const booking = await bookingService.confirmFromStripe(session.id, paymentIntentId);

    if (!booking) {
      console.warn(`[stripe-webhook] Sesión sin reserva asociada: ${session.id}`);
      res.status(200).json({ received: true });
      return;
    }

    // Fire-and-forget — la respuesta a Stripe ya está enviada antes de los emails
    void emailService.notifyOwnerPaymentReceived(booking);
    void emailService.sendGuestPaymentConfirmed(booking);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error al confirmar reserva:', err instanceof Error ? err.message : String(err));
    // 500 para que Stripe reintente el evento automáticamente
    res.status(500).json({ success: false, message: 'Error interno al procesar el pago' });
  }
}
