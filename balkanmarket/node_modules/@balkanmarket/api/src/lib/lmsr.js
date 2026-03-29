// src/lib/lmsr.js — Logarithmic Market Scoring Rule
// Ovo je srce cijelog trading sistema.

const Decimal = require("decimal.js");

/**
 * LMSR cost function
 * C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
 */
function cost(qYes, qNo, b) {
  const qy = new Decimal(qYes);
  const qn = new Decimal(qNo);
  const B  = new Decimal(b);
  return B.times(
    Decimal.exp(qy.div(B)).plus(Decimal.exp(qn.div(B))).ln()
  );
}

/**
 * Cijena (vjerovatnoća) YES dionice u centima (0–100)
 */
function yesPrice(qYes, qNo, b) {
  const qy = new Decimal(qYes);
  const qn = new Decimal(qNo);
  const B  = new Decimal(b);
  const ey = Decimal.exp(qy.div(B));
  const en = Decimal.exp(qn.div(B));
  return ey.div(ey.plus(en)).times(100).toDecimalPlaces(2);
}

/**
 * Koliko košta kupovina `shares` dionica strane `side`
 * Returns: { costEur, newQYes, newQNo, executionPrice }
 */
function buyCost(side, shares, qYes, qNo, b) {
  const s  = new Decimal(shares);
  const qy = new Decimal(qYes);
  const qn = new Decimal(qNo);

  const costBefore = cost(qy, qn, b);
  const newQYes    = side === "YES" ? qy.plus(s) : qy;
  const newQNo     = side === "NO"  ? qn.plus(s) : qn;
  const costAfter  = cost(newQYes, newQNo, b);

  const costEur        = costAfter.minus(costBefore);
  const executionPrice = side === "YES"
    ? yesPrice(newQYes, newQNo, b)
    : new Decimal(100).minus(yesPrice(newQYes, newQNo, b));

  return {
    costEur:        costEur.toDecimalPlaces(2),
    newQYes:        newQYes.toDecimalPlaces(6),
    newQNo:         newQNo.toDecimalPlaces(6),
    executionPrice: executionPrice.toDecimalPlaces(2),
  };
}

/**
 * Koliko dionica možeš kupiti za `amountEur`
 * Binary search jer nema analitičkog inverza
 */
function sharesForAmount(side, amountEur, qYes, qNo, b) {
  const amount = new Decimal(amountEur);
  let lo = new Decimal(0);
  let hi = amount.times(10); // gornja granica

  for (let i = 0; i < 64; i++) {
    const mid  = lo.plus(hi).div(2);
    const { costEur } = buyCost(side, mid, qYes, qNo, b);
    if (costEur.lt(amount)) lo = mid;
    else hi = mid;
    if (hi.minus(lo).lt(0.000001)) break;
  }

  return lo.plus(hi).div(2).toDecimalPlaces(6);
}

/**
 * Prinos pri prodaji `shares` dionica strane `side`
 */
function sellReturn(side, shares, qYes, qNo, b) {
  const s  = new Decimal(shares);
  const qy = new Decimal(qYes);
  const qn = new Decimal(qNo);

  const costBefore = cost(qy, qn, b);
  const newQYes    = side === "YES" ? qy.minus(s) : qy;
  const newQNo     = side === "NO"  ? qn.minus(s) : qn;

  // Ne možemo prodati više nego što ima
  if (newQYes.lt(0) || newQNo.lt(0)) {
    throw new Error("Nedovoljno dionica u pool-u");
  }

  const costAfter = cost(newQYes, newQNo, b);
  const returnEur = costBefore.minus(costAfter);

  return {
    returnEur: returnEur.toDecimalPlaces(2),
    newQYes:   newQYes.toDecimalPlaces(6),
    newQNo:    newQNo.toDecimalPlaces(6),
  };
}

/**
 * Quoted prices za UI (bez izmjene stanja)
 */
function getQuote(side, amountEur, qYes, qNo, b) {
  const shares = sharesForAmount(side, amountEur, qYes, qNo, b);
  const { costEur, executionPrice, newQYes, newQNo } = buyCost(side, shares, qYes, qNo, b);
  const fee = costEur.times(0.02).toDecimalPlaces(2); // 2% fee

  return {
    shares:         shares.toString(),
    costEur:        costEur.toString(),
    feeEur:         fee.toString(),
    totalEur:       costEur.plus(fee).toString(),
    executionPrice: executionPrice.toString(),
    priceImpact:    executionPrice.minus(
      side === "YES" ? yesPrice(qYes, qNo, b) : new Decimal(100).minus(yesPrice(qYes, qNo, b))
    ).abs().toDecimalPlaces(2).toString(),
    newYesPrice:    yesPrice(newQYes, newQNo, b).toFixed(0),
    newNoPrice:     new Decimal(100).minus(yesPrice(newQYes, newQNo, b)).toFixed(0),
  };
}

module.exports = { cost, yesPrice, buyCost, sharesForAmount, sellReturn, getQuote };
