# Rick Recargas — Backend

## Rodar
```
cd backend
npm install
cp .env.example .env
# ajuste DATABASE_URL e chaves dos gateways
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
Rotas:
- POST /payments/create  (pix|card)
- POST /payments/webhook
- GET  /payments/:id
- POST /topup/send
- GET  /topup/history
