import axios from 'axios';
import crypto from 'crypto';

const API = process.env.PAGARME_API_URL || 'https://api.pagar.me/core/v5';
const KEY = process.env.PAGARME_API_KEY || '';

export async function createPixCharge({ amount, description, customer, metadata }) {
  const body = {
    amount,
    payment_method: 'pix',
    pix: { expires_in: 3600 },
    customer, metadata
  };
  const { data } = await axios.post(`${API}/orders`, body, {
    headers: { Authorization: `Basic ${Buffer.from(KEY + ':').toString('base64')}` }
  });
  return data;
}

export async function createCardCharge({ amount, description, card_token, customer, metadata }) {
  const body = {
    amount,
    payment_method: 'credit_card',
    credit_card: { operation_type: 'auth_and_capture', card: { id: card_token } },
    customer, metadata
  };
  const { data } = await axios.post(`${API}/orders`, body, {
    headers: { Authorization: `Basic ${Buffer.from(KEY + ':').toString('base64')}` }
  });
  return data;
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  try {
    const secret = process.env.PAGARME_WEBHOOK_SECRET || '';
    if (!secret || !signatureHeader) return false;
    const provided = String(signatureHeader).trim();
    const parts = provided.split('=');
    const alg = (parts.length === 2 ? parts[0] : 'sha256').toLowerCase();
    const sig = parts.length === 2 ? parts[1] : provided;
    const hmac = crypto.createHmac(alg === 'sha1' ? 'sha1' : 'sha256', secret);
    hmac.update(rawBody, 'utf8');
    const digest = hmac.digest('hex');
    const a = Buffer.from(digest, 'hex');
    const b = Buffer.from(sig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}
