// prisma/seed.js — Seed baza sa inicijalnim tržištima

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding baze...");

  // Admin korisnik
  const adminHash = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@balkanmarket.ba" },
    update: {},
    create: {
      email:         "admin@balkanmarket.ba",
      passwordHash:  adminHash,
      displayName:   "Admin",
      kycStatus:     "VERIFIED",
      isAdmin:       true,
      emailVerified: true,
      balanceEur:    1000,
    },
  });

  // Test korisnik
  const userHash = await bcrypt.hash("test1234", 12);
  await prisma.user.upsert({
    where: { email: "test@balkanmarket.ba" },
    update: {},
    create: {
      email:         "test@balkanmarket.ba",
      passwordHash:  userHash,
      displayName:   "TestUser",
      kycStatus:     "BASIC",
      emailVerified: true,
      balanceEur:    250,
    },
  });

  // Tržišta
  const markets = [
    {
      question:    "Hoće li Srbija otvoriti pristupne pregovore sa EU do kraja 2026?",
      description: "Tržište se resolvuje na YES ako Evropska komisija zvanično otvori pregovarački okvir sa Srbijom prije 31.12.2026.",
      category:    "POLITIKA",
      icon:        "🇷🇸",
      yesPrice:    34,
      noPrice:     66,
      qYes:        40,
      qNo:         80,
      lmsrB:       100,
      volume:      142500,
      liquidity:   38200,
      endDate:     new Date("2026-12-31"),
    },
    {
      question:    "Hoće li Novak Đoković osvoji još jedan Grand Slam u 2026?",
      description: "Tržište se resolvuje na YES ako Đoković osvoji Australian Open, Roland Garros, Wimbledon ili US Open u 2026.",
      category:    "SPORT",
      icon:        "🎾",
      yesPrice:    58,
      noPrice:     42,
      qYes:        90,
      qNo:         65,
      lmsrB:       120,
      volume:      287000,
      liquidity:   91000,
      endDate:     new Date("2026-11-30"),
    },
    {
      question:    "Hoće li prosječna plata u BiH dostići 1500 KM do kraja 2026?",
      description: "Resolvuje se na YES ako Agencija za statistiku BiH objavi da je prosječna neto plata >= 1500 KM za oktobar 2026.",
      category:    "EKONOMIJA",
      icon:        "💰",
      yesPrice:    22,
      noPrice:     78,
      qYes:        25,
      qNo:         90,
      lmsrB:       80,
      volume:      54300,
      liquidity:   12100,
      endDate:     new Date("2026-12-31"),
    },
    {
      question:    "Hoće li biti vanrednih izbora u Crnoj Gori u 2026?",
      description: "Resolvuje se na YES ako se raspišu i održe vanredni parlamentarni izbori u Crnoj Gori tokom 2026. godine.",
      category:    "POLITIKA",
      icon:        "🗳️",
      yesPrice:    41,
      noPrice:     59,
      qYes:        55,
      qNo:         80,
      lmsrB:       90,
      volume:      88700,
      liquidity:   24500,
      endDate:     new Date("2026-09-30"),
    },
    {
      question:    "Hoće li neka balkanska zemlja proći grupnu fazu na Svjetskom Prvenstvu?",
      description: "Resolvuje se YES ako Srbija, Hrvatska, BiH, Slovenija ili Crna Gora prođu grupu na FIFA SP 2026.",
      category:    "SPORT",
      icon:        "⚽",
      yesPrice:    67,
      noPrice:     33,
      qYes:        110,
      qNo:         55,
      lmsrB:       100,
      volume:      193000,
      liquidity:   56000,
      endDate:     new Date("2026-07-20"),
    },
    {
      question:    "Hoće li turistički prihodi Crne Gore oboriti rekord u 2026?",
      description: "Resolvuje se YES ako Ministarstvo turizma CG objavi rekordne prihode od turizma za 2026. godinu.",
      category:    "EKONOMIJA",
      icon:        "🏖️",
      yesPrice:    71,
      noPrice:     29,
      qYes:        120,
      qNo:         50,
      lmsrB:       90,
      volume:      76400,
      liquidity:   19800,
      endDate:     new Date("2026-10-31"),
    },
    {
      question:    "Hoće li Kosovo postati punopravna članica UN do 2027?",
      description: "Resolvuje se YES ako Generalna skupština UN izglasa punopravno članstvo Kosova prije 1.1.2027.",
      category:    "POLITIKA",
      icon:        "🌍",
      yesPrice:    8,
      noPrice:     92,
      qYes:        10,
      qNo:         115,
      lmsrB:       100,
      volume:      215000,
      liquidity:   67000,
      endDate:     new Date("2027-01-01"),
    },
    {
      question:    "Hoće li Hrvatska uvesti digitalni euro kao primarnu valutu do 2027?",
      description: "Resolvuje se YES ako ECB i Hrvatska narodna banka zvanično pokrenu digitalni euro u HR do 1.1.2027.",
      category:    "TEHNOLOGIJA",
      icon:        "💻",
      yesPrice:    12,
      noPrice:     88,
      qYes:        14,
      qNo:         105,
      lmsrB:       80,
      volume:      31200,
      liquidity:   8900,
      endDate:     new Date("2026-12-31"),
    },
  ];

  for (const m of markets) {
    const existing = await prisma.market.findFirst({ where: { question: m.question } });
    if (!existing) {
      const created = await prisma.market.create({ data: { ...m, createdBy: admin.id } });
      // Seed price history (last 14 days)
      const historyPoints = [];
      const now = Date.now();
      for (let i = 13; i >= 0; i--) {
        const jitter = Math.floor(Math.random() * 8) - 4;
        historyPoints.push({
          marketId:  created.id,
          yesPrice:  Math.max(5, Math.min(95, m.yesPrice + jitter)),
          noPrice:   Math.max(5, Math.min(95, m.noPrice - jitter)),
          volume:    m.volume * ((14 - i) / 14),
          timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
        });
      }
      await prisma.marketHistory.createMany({ data: historyPoints });
      console.log("  ✓ Market:", created.question.slice(0, 50) + "...");
    }
  }

  console.log("✅ Seed završen!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
