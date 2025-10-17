import axios from 'axios';
const GN_BASE = process.env.GN_API_URL || 'https://api.gerencianet.com.br';
const ID = process.env.GERENCIANET_CLIENT_ID || '';
const SECRET = process.env.GERENCIANET_CLIENT_SECRET || '';

async function getToken() {
  const { data } = await axios.post(`${GN_BASE}/oauth/token`, { grant_type: 'client_credentials' }, {
    auth: { username: ID, password: SECRET }, headers: { 'Content-Type':'application/json' }
  });
  return data.access_token;
}

export async function createPixCharge({ amount, description, customer, metadata }) {
  const token = await getToken();
  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: (amount/100).toFixed(2) },
    chave: process.env.GN_PIX_KEY || 'sua-chave-pix@provedor.com',
    solicitacaoPagador: description || 'Pagamento Recarga',
    infoAdicionais: [{ nome:'msisdn', valor: metadata?.msisdn||''},{ nome:'op', valor: metadata?.operator||'' }]
  };
  const { data } = await axios.post(`${GN_BASE}/pix/cob`, body, { headers: { Authorization: `Bearer ${token}` }});
  const locId = data?.loc?.id;
  let qr=null; if (locId) { const r = await axios.get(`${GN_BASE}/pix/loc/${locId}/qrcode`, { headers: { Authorization: `Bearer ${token}` }}); qr=r.data; }
  return { id: data.txid || data.loc?.id, charges: [{ last_transaction: { qr_code: qr?.qrcode } }], raw: { data, qr } };
}

export async function createCardCharge({ amount, description, card_token, customer, metadata }) {
  return { id: 'gn_card_' + Math.random().toString(36).slice(2), status: 'pending', raw: {} };
}
export function verifyWebhookSignature(){ return true; }
