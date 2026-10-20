// The thank-you text a guest gets by SMS once their bill is paid. Staff send it from the
// counter phone's own messages app (an sms: link), so it costs nothing. Pure, so it's unit-tested.

/**
 * Switched on by the owner, 18 Oct 2026 (built 8 Oct). Set to `false` to hide
 * the "Text the receipt" box after payment and the "Text receipt" button in order history.
 */
export const RECEIPT_SMS_ENABLED = true;

const REVIEW_URL = "https://g.page/r/Cb44MqB8wgCAEBM/review";
const SITE = "healthyhungercafe.com";

export function receiptMessage(bill: { cafeName: string }) {
  return `Thank you for visiting ${bill.cafeName}! 🥗 Enjoyed your meal? Please leave us a quick review: ${REVIEW_URL} · Menu: ${SITE}`;
}

/**
 * Opens the phone's messages app with the number and text filled in. `?&body=` works on
 * both Android and iPhone.
 */
export const smsLink = (phone: string, text: string) => `sms:+91${phone}?&body=${encodeURIComponent(text)}`;
