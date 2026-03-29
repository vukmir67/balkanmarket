// src/routes/markets.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { optionalAuth } = require("../middleware/auth");

// ── GET /api/markets ──────────────────────────────────────────────────────────
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { category, status = "OPEN", search, sortBy = "volume", page = 1, limit = 20 } = req.query;

    const where = {
      status: status.toUpperCase(),
      ...(category && { category: category.toUpperCase() }),
      ...(search && { question: { contains: search, mode: "insensitive" } }),
    };

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: sortBy === "endDate"   ? { endDate: "asc" }
               : sortBy === "volume"    ? { volume: "desc" }
               : sortBy === "yesPrice"  ? { yesPrice: "desc" }
               : { createdAt: "desc" },
        skip:  (Number(page) - 1) * Number(limit),
        take:  Number(limit),
        select: {
          id: true, question: true, category: true, icon: true,
          yesPrice: true, noPrice: true, volume: true, liquidity: true,
          status: true, endDate: true, createdAt: true,
          _count: { select: { trades: true, positions: true } },
        },
      }),
      prisma.market.count({ where }),
    ]);

    res.json({
      markets,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
});

// ── GET /api/markets/:id ──────────────────────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const market = await prisma.market.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        resolution: true,
        _count: { select: { trades: true, positions: true } },
      },
    });

    // Dodaj korisnički position ako je prijavljen
    let userPosition = null;
    if (req.user) {
      userPosition = await prisma.position.findMany({
        where: { userId: req.user.id, marketId: market.id },
      });
    }

    res.json({ ...market, userPosition });
  } catch (err) { next(err); }
});

// ── GET /api/markets/:id/history ──────────────────────────────────────────────
router.get("/:id/history", async (req, res, next) => {
  try {
    const { days = 14 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const history = await prisma.marketHistory.findMany({
      where:   { marketId: req.params.id, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
      select:  { yesPrice: true, noPrice: true, volume: true, timestamp: true },
    });

    res.json(history);
  } catch (err) { next(err); }
});

// ── GET /api/markets/:id/trades ───────────────────────────────────────────────
router.get("/:id/trades", async (req, res, next) => {
  try {
    const trades = await prisma.trade.findMany({
      where:   { marketId: req.params.id },
      orderBy: { createdAt: "desc" },
      take:    50,
      select: {
        id: true, side: true, action: true, amountEur: true,
        shares: true, price: true, createdAt: true,
        user: { select: { displayName: true } },
      },
    });
    res.json(trades);
  } catch (err) { next(err); }
});

module.exports = router;
