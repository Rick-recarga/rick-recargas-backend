import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { sendTopup } from '../lib/providers/reloadly.js';

export const router = Router();

const RULES = { CLARO:{max:2, windowDays:20}, TIM:{max:2, windowDays:30}, VIVO:{max:3, windowDays:20} };

async function canTopup(operator, msisdn){
  const rule = RULES[operator] || { max:3, windowDays:20 };
  const from = new Date(Date.now() - rule.windowDays*24*60*60*1000);
  const recent = await prisma.topup.count({ where:{ operator, msisdn, createdAt:{ gte: from } } });
  return recent < rule.max;
}

router.post('/quote',(req,res)=>{
  const { operator, amount } = req.body;
  res.json({ operator, amount, fee:0, total:amount });
});

router.post('/send', async (req,res,next)=>{
  try{
    const { msisdn, operator, amount, externalRef } = req.body;
    if (!await canTopup(operator, msisdn)) return res.status(429).json({ error: 'Limite de recargas atingido neste período.' });
    const r = await sendTopup({ msisdn, operator, amount, externalRef });
    await prisma.topup.create({ data:{ msisdn, operator, amount:Number(amount), status: r.status || 'PROCESSING', externalRef: externalRef || null } });
    res.json(r);
  }catch(e){ next(e); }
});

router.get('/history', async (req,res,next)=>{
  try{
    const { msisdn } = req.query;
    const where = msisdn ? { msisdn: String(msisdn) } : {};
    const rows = await prisma.topup.findMany({ where, orderBy:{ createdAt:'desc' }, take:50 });
    res.json(rows);
  }catch(e){ next(e); }
});
