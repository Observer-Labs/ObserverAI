const sharp = require("sharp");
const fs = require("fs");

const W = 1600, H = 1000;

// ── palette ──
const C = {
  bg0: "#070707", bg1: "#0e0e0e",
  accent: "#f97316", accentDim: "rgba(249,115,22,0.28)",
  wa: "#25D366", waDark: "#0b3d2e", waBubble: "#10241c",
  text: "#ffffff", sub: "#8a8a92", mutedCard: "#141414",
  border: "rgba(255,255,255,0.08)",
};

// ── sources (left) ──
const sources = [
  { label: "App Store",        desc: "iOS reviews",          color: "#a78bfa" },
  { label: "Google Reviews",   desc: "Branch ratings",       color: "#4285F4" },
  { label: "Trustpilot",       desc: "Public reviews",       color: "#00b67a" },
  { label: "Shopify",          desc: "Returns · carts",      color: "#96bf48" },
  { label: "Support Email",    desc: "Complaints",           color: "#EA4335" },
  { label: "Uber Eats · Getir",desc: "Delivery reviews",     color: "#f79a00" },
  { label: "Google Analytics", desc: "Drop anomalies",       color: "#818cf8" },
  { label: "POS Data",         desc: "Sales by branch",      color: "#9aa3b2" },
];

const cardX = 70, cardW = 270, cardH = 64, gap = 18, startY = 230;
const hubL = 710, hubR = 890, hubCx = 800, hubCy = 500;

// source card centers
const centers = sources.map((_, i) => startY + i * (cardH + gap) + cardH / 2);

// ── helpers ──
function srcCard(s, i) {
  const y = startY + i * (cardH + gap);
  return `
    <g>
      <rect x="${cardX}" y="${y}" width="${cardW}" height="${cardH}" rx="13"
            fill="${C.mutedCard}" stroke="${C.border}" stroke-width="1"/>
      <rect x="${cardX}" y="${y + 12}" width="4" height="${cardH - 24}" rx="2" fill="${s.color}"/>
      <circle cx="${cardX + 34}" cy="${y + cardH / 2}" r="13" fill="${s.color}" opacity="0.18"/>
      <circle cx="${cardX + 34}" cy="${y + cardH / 2}" r="5" fill="${s.color}"/>
      <text x="${cardX + 60}" y="${y + 27}" font-family="Inter,Helvetica,Arial,sans-serif"
            font-size="17" font-weight="700" fill="${C.text}">${s.label}</text>
      <text x="${cardX + 60}" y="${y + 47}" font-family="Inter,Helvetica,Arial,sans-serif"
            font-size="12.5" fill="${C.sub}">${s.desc}</text>
    </g>`;
}

function inConnector(i) {
  const cy = centers[i];
  const ty = 448 + i * (104 / 7);
  const dots = [0.4, 0.7].map((t) => {
    // approx point along cubic for static "flow" dots
    const x = 340 + (hubL - 340) * t;
    const y = cy + (ty - cy) * (t * t * (3 - 2 * t));
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.6" fill="${C.accent}" opacity="${0.5 - i * 0.03}"/>`;
  }).join("");
  return `
    <path d="M ${cardX + cardW},${cy} C 530,${cy} 560,${ty} ${hubL},${ty}"
          fill="none" stroke="${C.accent}" stroke-width="1.4" opacity="0.22"/>
    ${dots}`;
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.bg0}"/>
      <stop offset="1" stop-color="${C.bg1}"/>
    </linearGradient>
    <radialGradient id="hubGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.accent}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${C.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="waGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.wa}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${C.wa}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- subtle grid -->
  ${Array.from({ length: 17 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${H}" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>`).join("")}
  ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 100}" x2="${W}" y2="${i * 100}" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>`).join("")}

  <!-- title -->
  <text x="${W / 2}" y="68" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="34" font-weight="800" fill="${C.text}" letter-spacing="-0.5">
    From scattered customer signals to one WhatsApp message
  </text>
  <text x="${W / 2}" y="102" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="16" fill="${C.sub}">
    Observer collects every channel, lets AI rank what matters, and sends it straight to your phone.
  </text>

  <!-- zone labels -->
  <text x="${cardX + 8}" y="190" font-family="Menlo,monospace" font-size="13" font-weight="700"
        fill="${C.sub}" letter-spacing="3">YOUR CUSTOMER SIGNALS</text>
  <text x="${hubCx}" y="190" text-anchor="middle" font-family="Menlo,monospace" font-size="13" font-weight="700"
        fill="${C.accent}" letter-spacing="3">SIGNAL AI ENGINE</text>
  <text x="1345" y="190" text-anchor="middle" font-family="Menlo,monospace" font-size="13" font-weight="700"
        fill="${C.wa}" letter-spacing="3">DELIVERED TO YOU</text>

  <!-- input connectors -->
  ${sources.map((_, i) => inConnector(i)).join("")}

  <!-- source cards -->
  ${sources.map((s, i) => srcCard(s, i)).join("")}

  <!-- ── CENTER HUB ── -->
  <ellipse cx="${hubCx}" cy="${hubCy}" rx="150" ry="150" fill="url(#hubGlow)"/>
  <rect x="${hubL}" y="${hubCy - 90}" width="180" height="180" rx="36"
        fill="#160d05" stroke="${C.accent}" stroke-width="2" opacity="1"/>
  <rect x="${hubL}" y="${hubCy - 90}" width="180" height="180" rx="36"
        fill="none" stroke="${C.accent}" stroke-width="1" opacity="0.3" filter="url(#soft)"/>
  <text x="${hubCx}" y="${hubCy - 28}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="42" font-weight="900" fill="${C.accent}">●</text>
  <text x="${hubCx}" y="${hubCy + 18}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="26" font-weight="800" fill="${C.text}" letter-spacing="-0.5">Observer</text>
  <text x="${hubCx}" y="${hubCy + 44}" text-anchor="middle" font-family="Menlo,monospace"
        font-size="11" font-weight="700" fill="${C.accent}" letter-spacing="1.5">AI ENGINE</text>
  <text x="${hubCx}" y="${hubCy + 70}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="12" fill="${C.sub}">Collect · Analyze · Rank</text>

  <!-- ── OUTPUT CONNECTORS ── -->
  <!-- to WhatsApp (thick, bright green) -->
  <path d="M ${hubR},${hubCy} C 1000,${hubCy} 1060,445 1150,445"
        fill="none" stroke="${C.wa}" stroke-width="4" opacity="0.65"/>
  <circle cx="1010" cy="492" r="4" fill="${C.wa}"/>
  <circle cx="1075" cy="465" r="4" fill="${C.wa}"/>
  <circle cx="1125" cy="450" r="4" fill="${C.wa}"/>
  <!-- to Slack (thin, dim) -->
  <path d="M ${hubR},${hubCy} C 1000,${hubCy} 1050,650 1150,650"
        fill="none" stroke="${C.sub}" stroke-width="1.6" opacity="0.3" stroke-dasharray="5 5"/>
  <!-- to Email (thin, dim) -->
  <path d="M ${hubR},${hubCy} C 1010,${hubCy} 1180,680 1380,680"
        fill="none" stroke="${C.sub}" stroke-width="1.6" opacity="0.3" stroke-dasharray="5 5"/>

  <!-- ── WHATSAPP (primary output) ── -->
  <ellipse cx="1345" cy="445" rx="230" ry="160" fill="url(#waGlow)"/>
  <rect x="1150" y="320" width="390" height="250" rx="22"
        fill="#0c1512" stroke="${C.wa}" stroke-width="2"/>
  <!-- header -->
  <circle cx="1186" cy="358" r="17" fill="${C.wa}" opacity="0.2"/>
  <path d="M 1186 350 a 8 8 0 1 0 0.1 0 l -3 5 z" fill="${C.wa}"/>
  <text x="1214" y="354" font-family="Inter,Helvetica,Arial,sans-serif" font-size="18" font-weight="800" fill="${C.text}">WhatsApp</text>
  <text x="1214" y="372" font-family="Inter,Helvetica,Arial,sans-serif" font-size="11.5" fill="${C.wa}">Observer · online</text>
  <rect x="1438" y="338" width="86" height="26" rx="13" fill="${C.wa}"/>
  <text x="1481" y="356" text-anchor="middle" font-family="Menlo,monospace" font-size="11" font-weight="800" fill="#06140d" letter-spacing="1">PRIMARY</text>

  <!-- chat bubble -->
  <rect x="1172" y="392" width="346" height="158" rx="4 14 14 14" fill="${C.waBubble}"/>
  <circle cx="1192" cy="416" r="5" fill="#f87171"/>
  <text x="1206" y="421" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13.5" font-weight="800" fill="#f87171">HIGH · 84/100</text>
  <text x="1188" y="448" font-family="Inter,Helvetica,Arial,sans-serif" font-size="14" font-weight="700" fill="#e9edef">Kadıköy branch — 14 "long wait"</text>
  <text x="1188" y="468" font-family="Inter,Helvetica,Arial,sans-serif" font-size="14" font-weight="700" fill="#e9edef">complaints this week. 2× vs last week.</text>
  <text x="1188" y="496" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13" fill="#9fd9bf">💰 weekend revenue at risk</text>
  <line x1="1188" y1="512" x2="1502" y2="512" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="1188" y="534" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13" font-weight="700" fill="${C.wa}">Reply  1 = details   ·   2 = on it</text>

  <!-- ── SLACK + EMAIL (optional) ── -->
  <rect x="1150" y="612" width="185" height="74" rx="14" fill="${C.mutedCard}" stroke="${C.border}" stroke-width="1"/>
  <circle cx="1180" cy="649" r="11" fill="#e879f9" opacity="0.18"/>
  <circle cx="1180" cy="649" r="4.5" fill="#e879f9"/>
  <text x="1200" y="645" font-family="Inter,Helvetica,Arial,sans-serif" font-size="15" font-weight="700" fill="${C.text}">Slack</text>
  <text x="1200" y="663" font-family="Inter,Helvetica,Arial,sans-serif" font-size="11" fill="${C.sub}">optional</text>

  <rect x="1355" y="612" width="185" height="74" rx="14" fill="${C.mutedCard}" stroke="${C.border}" stroke-width="1"/>
  <circle cx="1385" cy="649" r="11" fill="#6ea8ff" opacity="0.18"/>
  <circle cx="1385" cy="649" r="4.5" fill="#6ea8ff"/>
  <text x="1405" y="645" font-family="Inter,Helvetica,Arial,sans-serif" font-size="15" font-weight="700" fill="${C.text}">Email</text>
  <text x="1405" y="663" font-family="Inter,Helvetica,Arial,sans-serif" font-size="11" fill="${C.sub}">optional</text>

  <!-- caption under WhatsApp -->
  <text x="1345" y="740" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="15" font-weight="700" fill="${C.wa}">Insights reach your phone —</text>
  <text x="1345" y="762" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif"
        font-size="15" font-weight="700" fill="${C.wa}">no login, no dashboard.</text>

  <!-- footer brand -->
  <text x="${W / 2}" y="940" text-anchor="middle" font-family="Menlo,monospace" font-size="12"
        fill="${C.sub}" letter-spacing="2">SIGNAL · DECISION INTELLIGENCE</text>
</svg>`;

fs.writeFileSync("/Users/macintosh/Desktop/signal-flow.svg", svg);

sharp(Buffer.from(svg), { density: 200 })
  .png()
  .toFile("/Users/macintosh/Desktop/signal-flow.png")
  .then((info) => console.log("PNG written:", info.width + "x" + info.height))
  .catch((e) => { console.error(e); process.exit(1); });
