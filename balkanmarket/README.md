# 🎯 BalkanMarket

Balkanska platforma za prediktivna tržišta — fullstack monorepo.

## Tech Stack

| Sloj | Tech |
|------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + Socket.io |
| Baza | PostgreSQL 16 + Prisma ORM |
| AMM | LMSR (Logarithmic Market Scoring Rule) |
| Auth | JWT (access 15min + refresh 30d) |
| Plaćanja | Stripe (EUR) + Polygon USDC |
| Real-time | WebSocket via Socket.io |

## Struktura projekta

```
balkanmarket/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Baza podataka
│   │   │   └── seed.js         # Inicijalni podaci
│   │   └── src/
│   │       ├── index.js        # Server entry point
│   │       ├── lib/
│   │       │   ├── lmsr.js     # AMM algoritam
│   │       │   └── prisma.js   # DB klijent
│   │       ├── middleware/     # auth, rateLimiter, errorHandler
│   │       ├── routes/         # auth, markets, trades, payments, admin
│   │       └── services/
│   │           └── socket.js   # WebSocket
│   └── frontend/               # React SPA
│       └── src/
│           ├── App.jsx         # Router
│           ├── pages/          # Home, MarketDetail, Portfolio, Wallet, Login, Register, Admin
│           ├── components/     # Navbar, MarketCard, BetModal, PriceChart, Notifications
│           ├── hooks/          # useMarkets, useSocket
│           ├── store/          # authStore, notifStore (Zustand)
│           └── lib/            # api.js (Axios), lmsr.js (client-side)
└── package.json                # Monorepo root
```

---

## 🚀 Lokalno pokretanje

### 1. Preduslovi

```bash
node >= 18
npm  >= 9
PostgreSQL >= 14 (lokalno ili Railway/Supabase)
```

### 2. Kloniraj i instaliraj

```bash
git clone https://github.com/tvoj-username/balkanmarket.git
cd balkanmarket
npm install   # instalira sve workspace pakete
```

### 3. Postavi bazu podataka

Pokreni PostgreSQL lokalno ili kreiraj besplatnu bazu na [Railway.app](https://railway.app) ili [Supabase](https://supabase.com).

### 4. Konfiguriši environment

```bash
cd apps/api
cp .env.example .env
```

Uredi `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/balkanmarket"
JWT_SECRET="min_32_karaktera_random_string_ovdje"
REFRESH_SECRET="drugi_tajni_kljuc_za_refresh"
FRONTEND_URL="http://localhost:5173"

# Stripe (test ključevi sa dashboard.stripe.com)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 5. Migracije i seed

```bash
cd apps/api
npx prisma migrate dev --name init
node prisma/seed.js
```

Seed kreira:
- Admin nalog: `admin@balkanmarket.ba` / `admin123!`
- Test nalog:  `test@balkanmarket.ba` / `test1234`
- 8 tržišta sa historijom cijena

### 6. Pokreni development servere

```bash
# Terminal 1 — Backend (port 3001)
cd apps/api && npm run dev

# Terminal 2 — Frontend (port 5173)
cd apps/frontend && npm run dev
```

Otvori http://localhost:5173

---

## 📦 Deployment (Railway.app — besplatno za start)

### Backend

1. Kreiraj novi projekt na [Railway.app](https://railway.app)
2. Dodaj **PostgreSQL** plugin
3. Poveži GitHub repo, odaberi `apps/api` kao root
4. Postavi environment varijable (kopiraj iz `.env.example`)
5. Start command: `npm start`
6. Build command: `npx prisma migrate deploy && node prisma/seed.js`

### Frontend

1. Na [Vercel](https://vercel.com) ili [Netlify](https://netlify.com), poveži repo
2. Root directory: `apps/frontend`
3. Build command: `npm run build`
4. Output: `dist`
5. Environment: `VITE_API_URL=https://tvoj-api.railway.app`

> Ažuriraj `vite.config.js` proxy target na produkcijski API URL.

---

## 💳 Stripe Integracija

### Test mode

Koristi Stripe test kartice:
- `4242 4242 4242 4242` — uspješno plaćanje
- `4000 0000 0000 0002` — odbijeno plaćanje

### Webhook (lokalni razvoj)

```bash
# Instaliraj Stripe CLI
stripe listen --forward-to localhost:3001/api/payments/stripe/webhook
```

Kopiraj `whsec_...` u `.env` kao `STRIPE_WEBHOOK_SECRET`.

---

## 🔗 API Referenca

### Auth
```
POST   /api/auth/register     { email, password, displayName }
POST   /api/auth/login        { email, password }
POST   /api/auth/refresh      { refreshToken }
POST   /api/auth/logout       (JWT)
GET    /api/auth/me           (JWT)
```

### Tržišta
```
GET    /api/markets           ?category, search, sortBy, page
GET    /api/markets/:id
GET    /api/markets/:id/history
GET    /api/markets/:id/trades
```

### Trgovanje
```
GET    /api/trades/quote      ?marketId, side, amountEur  (JWT)
POST   /api/trades/buy        { marketId, side, amountEur } (JWT + KYC BASIC)
POST   /api/trades/sell       { marketId, side, shares }   (JWT + KYC BASIC)
GET    /api/trades/positions  (JWT)
GET    /api/trades/history    (JWT)
```

### Plaćanja
```
POST   /api/payments/deposit/fiat    { amount }         (JWT + KYC BASIC)
POST   /api/payments/withdraw/fiat   { amount, iban }   (JWT + KYC VERIFIED)
GET    /api/payments/history         (JWT)
POST   /api/payments/stripe/webhook  (Stripe signature)
```

### Admin
```
POST   /api/admin/markets               { question, category, endDate, ... }
PUT    /api/admin/markets/:id/resolve   { outcome, sourceUrl }
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id/kyc         { kycStatus }
```

---

## 🧮 LMSR Algoritam

Koristi se **Logarithmic Market Scoring Rule**:

```
C(q_yes, q_no) = b × ln(e^(q_yes/b) + e^(q_no/b))

P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
```

- `b` = parametar likvidnosti (veće b = sporije promjene cijene)
- Cijena YES dionice direktno odražava implicitnu vjerovatnoću
- Svaka dionica se resolvuje na €1 (pobjednička strana) ili €0

---

## 🔒 Sigurnost

- JWT access tokeni (15 min) + refresh tokeni (30 dana, httpOnly)
- Rate limiting: 120 req/min globalno, 20 req/15min za auth
- Sve finansijske operacije u PostgreSQL transakcijama (`$transaction`)
- `Decimal.js` za sve kalkulacije (bez float grešaka)
- Zod validacija na svim inputima
- Helmet.js za HTTP security headers

---

## 📋 Sljedeći koraci (Faza 2)

- [ ] Email verifikacija (Resend.com)
- [ ] KYC integracija (Sumsub SDK)
- [ ] Polygon USDC deposit/withdraw (Alchemy + Ethers.js)
- [ ] Wallet connect (wagmi)
- [ ] Stripe Checkout UI (React Stripe.js)
- [ ] Push notifikacije za resoluciju
- [ ] Affiliate/referral sistem
- [ ] Mobile app (React Native / Expo)

---

## 📄 Licenca

Privatno — sve pravice zadržane. © 2026 BalkanMarket
