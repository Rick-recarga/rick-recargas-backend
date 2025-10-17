import express, { Router } from 'express';
import { prisma } from '../lib/db.js';
import { createPixCharge as pagarmePix, createCardCharge as pagarmeCard, verifyWebhookSignature as pagarmeVerify } from '../lib/gateways/pagarme.js';
import { createPixCharge as gnPix, createCardCharge as gnCard, verifyWebhookSignature as gnVerify } from '../lib/gateways/gerencianet.js';
import { sendTopup } from '../lib/providers/reloadly.js';

export const router = Router();

router.post('/create', async (req, res, next) => {
  try {
    const { amount, method, msisdn, operator, gateway='pagarme' } = req.body;
    const cents = Math.round(Number(amount) * 100);
    const metadata = { msisdn, operator };
    const customer = { name:'Cliente', email:'cliente@example.com' };
    let result;
    if (method === 'pix') {
      result = await (gateway==='gerencianet'? gnPix : pagarmePix)({ amount:cents, description:'Recarga de celular', customer, metadata });
    } else if (method === 'card') {
      const { card_token } = req.body;
      result = await (gateway==='gerencianet'? gnCard : pagarmeCard)({ amount:cents, description:'Recarga de celular', card_token, customer, metadata });
    } else {
      return res.status(400).json({ error: 'Método inválido' });
    }
    const paymentId = result?.id || ('pay_' + Math.random().toString(36).slice(2));
    await prisma.payment.create({ data: { id: paymentId, status:'pending', msisdn, operator, amount:Number(amount), method, provider:gateway, gatewayId: result?.id || null, gatewayRaw: { gateway, ...result } } });
    res.json({ id: paymentId, gateway: result });
  } catch(e){ next(e); }
});

router.post('/webhook', express.text({ type: '*/*' }), async (req,res,next)=>{
  try {
    const raw = req.body;
    const headerName = (process.env.PAGARME_SIGNATURE_HEADER || 'x-hub-signature').toLowerCase();
    const pgSig = req.headers[headerName];
    const gnSig = req.headers['x-gn-signature'] || req.headers['x-gerencianet-signature'];
    const ok = (pgSig ? pagarmeVerify(raw, pgSig) : false) || (gnSig ? gnVerify(raw, gnSig) : false);
    if (!ok) console.warn('Webhook signature not verified (dev mode)');
    let evt={}; try{ evt=JSON.parse(raw);}catch{}
    const id = evt?.data?.id || evt?.id || evt?.payment_id;
    const status = String(evt?.data?.status || evt?.status || '').toLowerCase();
    if (id) {
      const p = await prisma.payment.findUnique({ where:{ id } });
      if (p) {
        if (['paid','succeeded','paid_pending_refund'].includes(status)) {
          await prisma.payment.update({ where:{ id }, data:{ status:'fulfilled', paidAt:new Date() } });
          await sendTopup({ msisdn: p.msisdn, operator: p.operator, amount: p.amount, externalRef: id });
        } else if (['failed','canceled'].includes(status)) {
          await prisma.payment.update({ where:{ id }, data:{ status:'failed' } });
        }
      }
    }
    res.status(200).end();
  } catch(e){ next(e); }
});

router.get('/:id', async (req,res,next)=>{
  try {
    const p = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch(e){ next(e); }
});
