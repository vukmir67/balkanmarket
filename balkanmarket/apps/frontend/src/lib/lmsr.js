// src/lib/lmsr.js — Client-side LMSR za instant preview cijene

function cost(qYes, qNo, b) {
  return b * Math.log(Math.exp(qYes / b) + Math.exp(qNo / b));
}

export function yesPrice(qYes, qNo, b) {
  const ey = Math.exp(qYes / b);
  const en = Math.exp(qNo / b);
  return Math.round((ey / (ey + en)) * 100);
}

export function getQuote(side, amountEur, qYes, qNo, b) {
  if (!amountEur || amountEur <= 0) return null;

  // Binary search za shares
  let lo = 0, hi = amountEur * 10;
  const costBefore = cost(qYes, qNo, b);

  for (let i = 0; i < 64; i++) {
    const mid    = (lo + hi) / 2;
    const newQYes = side === "YES" ? qYes + mid : qYes;
    const newQNo  = side === "NO"  ? qNo  + mid : qNo;
    const c = cost(newQYes, newQNo, b) - costBefore;
    if (c < amountEur) lo = mid; else hi = mid;
    if (hi - lo < 0.000001) break;
  }
  const shares = (lo + hi) / 2;

  const newQYes = side === "YES" ? qYes + shares : qYes;
  const newQNo  = side === "NO"  ? qNo  + shares : qNo;
  const fee     = amountEur * 0.02;
  const newYes  = yesPrice(newQYes, newQNo, b);
  const curPrice = side === "YES" ? yesPrice(qYes, qNo, b) : 100 - yesPrice(qYes, qNo, b);

  return {
    shares:         shares.toFixed(4),
    feeEur:         fee.toFixed(2),
    totalEur:       (amountEur + fee).toFixed(2),
    executionPrice: side === "YES" ? newYes : 100 - newYes,
    priceImpact:    Math.abs((side === "YES" ? newYes : 100 - newYes) - curPrice),
    newYesPrice:    newYes,
    newNoPrice:     100 - newYes,
    potentialReturn: shares.toFixed(2),
  };
}
