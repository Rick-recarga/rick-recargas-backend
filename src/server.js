import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { router as payments } from './routes/payments.js';
import { router as topup } from './routes/topup.js';
import { prisma } from './lib/db.js';

const app = express();
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));
app.use(morgan('dev'));

app.get('/health', async (req,res)=>{
  res.json({ ok:true, ts: new Date().toISOString() });
});

app.use('/payments', payments);
app.use('/topup', topup);

// error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('API on http://localhost:'+port));
