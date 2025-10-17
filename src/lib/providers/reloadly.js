// Placeholder top-up provider. Replace with real aggregator later.
export async function sendTopup({ msisdn, operator, amount, externalRef }) {
  return {
    id: 'topup_' + Math.random().toString(36).slice(2),
    status: 'PROCESSING',
    msisdn, operator, amount,
    externalRef: externalRef || null,
    message: 'Top-up enviado para processamento (simulado).'
  };
}
