import { bookingApi } from './bookingApi';

export type PaymentProvider = 'payos' | 'momo';

/**
 * Starts a payment for a booking that already exists in pending_payment and sends the browser
 * to the gateway. PayOS runs in demo mode without real credentials and then answers with an
 * internal URL instead of a gateway one, so callers get `false` and handle that themselves.
 */
export async function startPayment(
  provider: PaymentProvider,
  bookingId: string,
  amount: number,
): Promise<boolean> {
  if (provider === 'momo') {
    const res = await bookingApi.createMomoPayment(bookingId, amount);
    if (res.payUrl && res.payUrl.startsWith('http')) {
      window.location.href = res.payUrl;
      return true;
    }
    return false;
  }

  const res = await bookingApi.createPayosPayment(bookingId, amount);
  if (res.checkoutUrl && res.checkoutUrl.startsWith('http')) {
    window.location.href = res.checkoutUrl;
    return true;
  }
  return false;
}
