// src/routes/admin.js
const router = require("express").Router();
const { z }  = require("zod");
const Decimal = require("decimal.js");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);

// ── POST /api/admin/markets ───────────────────────────────────────────────────
router.post("/markets", async (req, res, next) => {
  try {
    const schema = z.object({
      question:    z.string().min(10).max(300),
      description: z.string().optional(),
      category:    z.enum(["POLITIKA","SPORT","EKONOMIJA","TEHNOLOGIJA","KULTURA","OSTALO"]),
      icon:        z.string().default("🎯"),
      endDate:     z.string().datetime(),
      lmsrB:       z.number().positive().default(100),
      liquidity:   z.number().positive().default(1000),
    });
    const data = schema.parse(req.body);

    const market = await prisma.market.create({
      data: { ...data, createdBy: req.user.id },
    });
    res.status(201).json(market);
  } catch (err) { next(err); }
});

// ── PUT /api/admin/markets/:id/resolve ────────────────────────────────────────
router.put("/markets/:id/resolve", async (req, res, next) => {
  try {
    const { outcome, sourceUrl, notes } = z.object({
      outcome:   z.enum(["YES", "NO", "CANCELLED"]),
      sourceUrl: z.string().url("Unesite validan URL izvora"),
      notes:     z.string().optional(),
    }).parse(req.body);

    const market = await prisma.market.findUniqueOrThrow({ where: { id: req.params.id } });
    if (market.status === "RESOLVED") return res.status(400).json({ error: "Tržište je već razriješeno" });

    await prisma.$transaction(async (tx) => {
      // 1. Označi market kao resolved
      await tx.market.update({
        where: { id: market.id },
        data:  { status: outcome === "CANCELLED" ? "CANCELLED" : "RESOLVED" },
      });

      // 2. Kreiraj resolution zapis
      await tx.resolution.create({
        data: { marketId: market.id, outcome, sourceUrl, notes: notes || null, resolvedBy: req.user.id },
      });

      if (outcome === "CANCELLED") {
        // Refunduj sve pozicije po avg cijeni
        const positions = await tx.position.findMany({ where: { marketId: market.id } });
        for (const pos of positions) {
          const refund = new Decimal(pos.shares).times(pos.avgPrice).div(100);
          await tx.user.update({
            where: { id: pos.userId },
            data:  { balanceEur: { increment: refund.toNumber() } },
          });
        }
      } else {
        // Isplati winnere
        const positions = await tx.position.findMany({
          where: { marketId: market.id, side: outcome },
        });
        const SETTLEMENT_FEE = 0.005;
        for (const pos of positions) {
          const gross  = new Decimal(pos.shares); // 1 EUR po dionici
          const fee    = gross.times(SETTLEMENT_FEE);
          const payout = gross.minus(fee);
          await tx.user.update({
            where: { id: pos.userId },
            data:  { balanceEur: { increment: payout.toNumber() } },
          });
          await tx.position.update({
            where: { id: pos.id },
            data:  { pnl: payout.minus(new Decimal(pos.shares).times(pos.avgPrice).div(100)).toNumber() },
          });
        }
      }
    });

    // Real-time notifikacija
    req.app.get("io")?.emit("marketResolved", { marketId: market.id, outcome });

    res.json({ success: true, message: `Tržište razriješeno: ${outcome}` });
  } catch (err) { next(err); }
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const [users, markets, totalVolume, payments] = await Promise.all([
      prisma.user.count(),
      prisma.market.groupBy({ by: ["status"], _count: true }),
      prisma.trade.aggregate({ _sum: { amountEur: true } }),
      prisma.payment.groupBy({ by: ["status"], _sum: { amountEur: true } }),
    ]);
    res.json({ users, markets, totalVolume: totalVolume._sum.amountEur, payments });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, displayName: true, kycStatus: true,
                balanceEur: true, isAdmin: true, createdAt: true,
                _count: { select: { trades: true } } },
      take: 100,
    });
    res.json(users);
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/kyc ──────────────────────────────────────────────
router.put("/users/:id/kyc", async (req, res, next) => {
  try {
    const { kycStatus } = z.object({
      kycStatus: z.enum(["PENDING", "BASIC", "VERIFIED", "PREMIUM"]),
    }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { kycStatus },
      select: { id: true, email: true, kycStatus: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
