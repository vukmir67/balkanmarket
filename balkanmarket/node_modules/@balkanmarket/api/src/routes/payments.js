// src/routes/payments.js
const router = require("express").Router();
const { z }  = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth, requireKyc } = require("../middleware/auth");

// Lazy init Stripe (ne gasi server ako key nije postavljen u dev)
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
}

// ── POST /api/payments/deposit/fiat ───────────────────────────────────────────
router.post("/deposit/fiat", requireAuth, requireKyc("BASIC"), async (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.number().min(5).max(10000) }).parse(req.body);
    const stripe = getStripe();

    if (!stripe) {
      // Dev mode: simuliraj deposit
      await prisma.user.update({ where: { id: req.user.id }, data: { balanceEur: { increment: amount } } });
      await prisma.payment.create({
        data: { userId: req.user.id, type: "DEPOSIT", provider: "STRIPE", amountEur: amount, status: "COMPLETED", stripeId: "dev_" + Date.now() },
      });
      return res.json({ clientSecret: null, dev: true, message: `Simulovano: +€${amount} dodano na balans` });
    }

    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: "eur",
      metadata: { userId: req.user.id, type: "deposit" },
    });

    await prisma.payment.create({
      data: { userId: req.user.id, type: "DEPOSIT", provider: "STRIPE", amountEur: amount, status: "PENDING", stripeId: intent.id },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) { next(err); }
});

// ── POST /api/payments/stripe/webhook ────────────────────────────────────────
router.post("/stripe/webhook", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.json({ received: true });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: "Webhook signature greška" });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const { userId, type } = intent.metadata;

    if (type === "deposit") {
      const amountEur = intent.amount / 100;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { balanceEur: { increment: amountEur } } }),
        prisma.payment.updateMany({ where: { stripeId: intent.id }, data: { status: "COMPLETED" } }),
      ]);
    }
  }

  res.json({ received: true });
});

// ── GET /api/payments/history ─────────────────────────────────────────────────
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take:    50,
    });
    res.json(payments);
  } catch (err) { next(err); }
});

// ── POST /api/payments/withdraw/fiat (stub) ───────────────────────────────────
router.post("/withdraw/fiat", requireAuth, requireKyc("VERIFIED"), async (req, res, next) => {
  try {
    const { amount, iban } = z.object({
      amount: z.number().min(10).max(5000),
      iban:   z.string().min(15),
    }).parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
    if (user.balanceEur < amount) return res.status(400).json({ error: "Nedovoljno sredstava" });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { balanceEur: { decrement: amount } } }),
      prisma.payment.create({
        data: { userId: req.user.id, type: "WITHDRAWAL", provider: "STRIPE", amountEur: amount, status: "PENDING", iban },
      }),
    ]);

    res.json({ success: true, message: "Zahtjev za isplatu primljen. Obradit ćemo ga u roku 1-3 radna dana." });
  } catch (err) { next(err); }
});

module.exports = router;
