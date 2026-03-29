// src/routes/trades.js
const router  = require("express").Router();
const { z }   = require("zod");
const Decimal = require("decimal.js");
const prisma  = require("../lib/prisma");
const lmsr    = require("../lib/lmsr");
const { requireAuth, requireKyc } = require("../middleware/auth");

const TRADING_FEE = 0.02; // 2%

// ── GET /api/trades/quote ─────────────────────────────────────────────────────
router.get("/quote", requireAuth, async (req, res, next) => {
  try {
    const { marketId, side, amountEur } = z.object({
      marketId:  z.string(),
      side:      z.enum(["YES", "NO"]),
      amountEur: z.coerce.number().positive(),
    }).parse(req.query);

    const market = await prisma.market.findUniqueOrThrow({ where: { id: marketId } });
    if (market.status !== "OPEN") return res.status(400).json({ error: "Tržište nije otvoreno" });

    const quote = lmsr.getQuote(side, amountEur, market.qYes, market.qNo, market.lmsrB);
    res.json(quote);
  } catch (err) { next(err); }
});

// ── POST /api/trades/buy ──────────────────────────────────────────────────────
router.post("/buy", requireAuth, requireKyc("BASIC"), async (req, res, next) => {
  try {
    const schema = z.object({
      marketId:  z.string(),
      side:      z.enum(["YES", "NO"]),
      amountEur: z.number().positive().max(10000),
    });
    const { marketId, side, amountEur } = schema.parse(req.body);

    // Sve u jednoj transakciji da izbjegnemo race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock market row
      const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } });
      if (market.status !== "OPEN") throw Object.assign(new Error("Tržište nije otvoreno"), { status: 400 });
      if (new Date() > market.endDate)  throw Object.assign(new Error("Tržište je isteklo"), { status: 400 });

      // 2. Lock user row
      const user = await tx.user.findUniqueOrThrow({ where: { id: req.user.id } });
      const fee        = new Decimal(amountEur).times(TRADING_FEE);
      const totalCost  = new Decimal(amountEur).plus(fee);
      if (new Decimal(user.balanceEur).lt(totalCost)) {
        throw Object.assign(new Error("Nedovoljno sredstava"), { status: 400 });
      }

      // 3. LMSR: koliko dionica za amountEur
      const shares = lmsr.sharesForAmount(side, amountEur, market.qYes, market.qNo, market.lmsrB);
      const { newQYes, newQNo, executionPrice } = lmsr.buyCost(side, shares, market.qYes, market.qNo, market.lmsrB);

      const newYesPrice = lmsr.yesPrice(newQYes, newQNo, market.lmsrB).toFixed(0);
      const newNoPrice  = String(100 - Number(newYesPrice));

      // 4. Skini balans
      await tx.user.update({
        where: { id: user.id },
        data:  { balanceEur: { decrement: totalCost.toNumber() } },
      });

      // 5. Ažuriraj market (qYes/qNo + cijene + volume)
      await tx.market.update({
        where: { id: marketId },
        data:  {
          qYes:     newQYes.toString(),
          qNo:      newQNo.toString(),
          yesPrice: Number(newYesPrice),
          noPrice:  Number(newNoPrice),
          volume:   { increment: amountEur },
        },
      });

      // 6. Upsert position
      const existing = await tx.position.findUnique({
        where: { userId_marketId_side: { userId: user.id, marketId, side } },
      });

      if (existing) {
        const totalShares = new Decimal(existing.shares).plus(shares);
        const newAvg = new Decimal(existing.avgPrice)
          .times(existing.shares)
          .plus(new Decimal(executionPrice).times(shares))
          .div(totalShares)
          .toFixed(0);
        await tx.position.update({
          where: { id: existing.id },
          data:  { shares: totalShares.toString(), avgPrice: Number(newAvg) },
        });
      } else {
        await tx.position.create({
          data: { userId: user.id, marketId, side, shares: shares.toString(), avgPrice: Number(executionPrice) },
        });
      }

      // 7. Trade zapis
      const trade = await tx.trade.create({
        data: {
          userId: user.id, marketId, side, action: "BUY",
          amountEur, shares: shares.toString(),
          price: Number(executionPrice),
          fee: fee.toNumber(),
        },
      });

      // 8. Price history snapshot
      await tx.marketHistory.create({
        data: { marketId, yesPrice: Number(newYesPrice), noPrice: Number(newNoPrice), volume: market.volume.toNumber() + amountEur },
      });

      return { trade, shares: shares.toString(), executionPrice: executionPrice.toString(), newYesPrice, newNoPrice };
    });

    // 9. Emituj real-time update
    req.app.get("io")?.to(`market:${marketId}`).emit("priceUpdate", {
      marketId,
      yesPrice: result.newYesPrice,
      noPrice:  result.newNoPrice,
    });

    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// ── POST /api/trades/sell ─────────────────────────────────────────────────────
router.post("/sell", requireAuth, requireKyc("BASIC"), async (req, res, next) => {
  try {
    const { marketId, side, shares: sharesToSell } = z.object({
      marketId: z.string(),
      side:     z.enum(["YES", "NO"]),
      shares:   z.number().positive(),
    }).parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } });
      if (market.status !== "OPEN") throw Object.assign(new Error("Tržište nije otvoreno"), { status: 400 });

      const position = await tx.position.findUnique({
        where: { userId_marketId_side: { userId: req.user.id, marketId, side } },
      });
      if (!position || new Decimal(position.shares).lt(sharesToSell)) {
        throw Object.assign(new Error("Nemaš dovoljno dionica"), { status: 400 });
      }

      const { returnEur, newQYes, newQNo } = lmsr.sellReturn(side, sharesToSell, market.qYes, market.qNo, market.lmsrB);
      const fee     = returnEur.times(TRADING_FEE);
      const payout  = returnEur.minus(fee);

      const newYesPrice = lmsr.yesPrice(newQYes, newQNo, market.lmsrB).toFixed(0);
      const newNoPrice  = String(100 - Number(newYesPrice));

      await tx.user.update({
        where: { id: req.user.id },
        data:  { balanceEur: { increment: payout.toNumber() } },
      });

      await tx.market.update({
        where: { id: marketId },
        data:  { qYes: newQYes.toString(), qNo: newQNo.toString(), yesPrice: Number(newYesPrice), noPrice: Number(newNoPrice) },
      });

      const newShares = new Decimal(position.shares).minus(sharesToSell);
      if (newShares.isZero()) {
        await tx.position.delete({ where: { id: position.id } });
      } else {
        await tx.position.update({ where: { id: position.id }, data: { shares: newShares.toString() } });
      }

      const trade = await tx.trade.create({
        data: {
          userId: req.user.id, marketId, side, action: "SELL",
          amountEur: payout.toNumber(), shares: String(sharesToSell),
          price: Number(newYesPrice), fee: fee.toNumber(),
        },
      });

      return { trade, returnEur: payout.toString(), newYesPrice, newNoPrice };
    });

    req.app.get("io")?.to(`market:${marketId}`).emit("priceUpdate", {
      marketId, yesPrice: result.newYesPrice, noPrice: result.newNoPrice,
    });

    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// ── GET /api/trades/positions ─────────────────────────────────────────────────
router.get("/positions", requireAuth, async (req, res, next) => {
  try {
    const positions = await prisma.position.findMany({
      where:   { userId: req.user.id },
      include: { market: { select: { id: true, question: true, icon: true, yesPrice: true, noPrice: true, status: true, endDate: true } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(positions);
  } catch (err) { next(err); }
});

// ── GET /api/trades/history ───────────────────────────────────────────────────
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const trades = await prisma.trade.findMany({
      where:   { userId: req.user.id },
      include: { market: { select: { id: true, question: true, icon: true } } },
      orderBy: { createdAt: "desc" },
      take:    100,
    });
    res.json(trades);
  } catch (err) { next(err); }
});

module.exports = router;
