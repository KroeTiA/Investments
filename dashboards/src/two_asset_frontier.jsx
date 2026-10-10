import React, { useState, useMemo, useRef, useCallback } from "react";

// ─── FHNW Investments palette ────────────────────────────────────────────────
const C = {
  yellow: "#FFD500",
  yellowLight: "#FFD50033",
  yellowMid: "#FFD50077",
  yellowSoft: "#FFF8D6",
  dark: "#1D1D1B",
  darkSoft: "#4A4A48",
  gray: "#9CA3AF",
  grayMid: "#D1D5DB",
  grayLight: "#F3F4F6",
  grayBg: "#F8F9FA",
  blue: "#0057A4",
  blueSoft: "#0057A422",
  blueLight: "#E8F0FE",
  red: "#C8102E",
  redSoft: "#C8102E22",
  green: "#2E7D32",
  greenSoft: "#2E7D3222",
  white: "#FFFFFF",
};
const AMBER = "#E8A838";
const FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";

// Exercise data (two-security model): bond fund, equity fund, cash
const DEFAULTS = { EB: 3, sB: 8, EE: 8, sE: 18, rho: 0.2, rf: 1, target: 6 };

// ─── Maths (all inputs in %, variances in %²) ────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function stats(wE, p) {
  const wB = 1 - wE;
  const cov = p.rho * p.sB * p.sE;
  const E = wB * p.EB + wE * p.EE;
  const v = wB * wB * p.sB * p.sB + wE * wE * p.sE * p.sE + 2 * wB * wE * cov;
  return { wB, wE, E, s: Math.sqrt(Math.max(v, 0)) };
}

export function solve(p, shortSales) {
  const vB = p.sB * p.sB, vE = p.sE * p.sE;
  const cov = p.rho * p.sB * p.sE;
  const D = vB + vE - 2 * cov;
  const rB = p.EB - p.rf, rE = p.EE - p.rf;

  // Minimum-variance portfolio
  const wE_mvpRaw = D > 1e-9 ? (vB - cov) / D : (p.sB <= p.sE ? 0 : 1);
  const wE_mvp = shortSales ? wE_mvpRaw : clamp(wE_mvpRaw, 0, 1);
  const mvp = stats(wE_mvp, p);

  // Tangency (maximum-Sharpe) portfolio
  const den = rB * vE + rE * vB - (rB + rE) * cov; // = D · (E(R_MVP) − R_f)
  const num = rB * vE - rE * cov;
  const wB_tpFormula = Math.abs(den) > 1e-9 ? num / den : NaN;
  let tp = null, tpStatus = "ok";
  if (shortSales) {
    if (D > 1e-9 && den > 1e-9) tp = stats(1 - wB_tpFormula, p);
    else tpStatus = "none";
  } else if (D > 1e-9 && den > 1e-9 && wB_tpFormula >= 0 && wB_tpFormula <= 1) {
    tp = stats(1 - wB_tpFormula, p); // interior optimum: closed form is exact
  } else {
    let best = null;
    const N = 4000;
    for (let i = 0; i <= N; i++) {
      const s = stats(i / N, p);
      if (s.s < 1e-9) continue;
      const sh = (s.E - p.rf) / s.s;
      if (!best || sh > best.sh) best = { ...s, sh };
    }
    if (best && best.sh > 0) tp = best; else tpStatus = "cash";
  }
  if (tp && tp.s < 1e-6) { tpStatus = "arbitrage"; tp = { ...tp, sharpe: Infinity }; }
  else if (tp) tp = { ...tp, sharpe: (tp.E - p.rf) / tp.s };

  // Optimal complete portfolio on the CAL at the target return
  let cp = null;
  if (tp && tpStatus === "ok" && tp.E > p.rf) {
    const y = (p.target - p.rf) / (tp.E - p.rf);
    cp = { y, E: p.target, s: y * tp.s, wB: y * tp.wB, wE: y * tp.wE, wC: 1 - y, sharpe: tp.sharpe };
  }

  // Risky-only portfolio with the same target return (no cash)
  let ro = null;
  if (Math.abs(p.EE - p.EB) > 1e-9) {
    const wE = (p.target - p.EB) / (p.EE - p.EB);
    const feasible = shortSales || (wE >= -1e-9 && wE <= 1 + 1e-9);
    ro = { ...stats(wE, p), feasible };
    ro.sharpe = ro.s > 1e-9 ? (ro.E - p.rf) / ro.s : NaN;
  }

  // Correlation above which E(R_MVP) ≤ R_f (no tangency on the upper branch)
  const rhoCrit = rB + rE > 1e-9 ? (rB * vE + rE * vB) / (rB + rE) / (p.sB * p.sE) : NaN;

  return { cov, D, rB, rE, vB, vE, mvp, wE_mvpRaw, tp, tpStatus, wB_tpFormula, num, den, cp, ro, rhoCrit };
}

// ─── Formatting ──────────────────────────────────────────────────────────────
const pct = (v, d = 2) => (Number.isFinite(v) ? `${v.toFixed(d)}%` : "–");
const wpct = (w, d = 1) => (Number.isFinite(w) ? `${(100 * w).toFixed(d)}%` : "–");
const num = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "–");
const niceCeil = (v, step) => Math.ceil(v / step - 1e-9) * step;
const niceFloor = (v, step) => Math.floor(v / step + 1e-9) * step;

// ─── Reusable components ─────────────────────────────────────────────────────
function SliderControl({ id, label, value, min, max, step, onChange, fmt, color, description }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: C.darkSoft }}
          dangerouslySetInnerHTML={{ __html: label }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: color || C.blue, fontFamily: "monospace" }}>
          {fmt ? fmt(value) : value.toFixed(1)}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color || C.blue, margin: "2px 0 0" }} />
      {description && (
        <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.4, marginTop: 3 }}>{description}</div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.white, borderRadius: 6, padding: "12px 14px", minWidth: 0,
      border: `1px solid ${C.grayMid}40`, borderLeft: `3px solid ${accent || C.blue}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: C.gray, marginBottom: 2 }}
        dangerouslySetInnerHTML={{ __html: label }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: sub }} />}
    </div>
  );
}

// SVG label with white backing; optional subscript part (e.g. R + f)
const labelWidth = (text, sub, fs) => (text.length + (sub ? sub.length * 0.75 : 0)) * fs * 0.58;
function ChartLabel({ x, y, text, sub, color, anchor = "start", fontSize = 14, weight = 700 }) {
  const pad = 3;
  const estW = labelWidth(text, sub, fontSize);
  const rx = anchor === "end" ? x - estW - pad : anchor === "middle" ? x - estW / 2 - pad : x - pad;
  return (
    <g>
      <rect x={rx} y={y - fontSize + 1} width={estW + pad * 2} height={fontSize + pad * 2}
        rx={2} fill={C.white} fillOpacity={0.88} />
      <text x={x} y={y} textAnchor={anchor} fontSize={fontSize} fontWeight={weight} fill={color}>
        {text}
        {sub && <tspan baselineShift="sub" fontSize={fontSize * 0.72}>{sub}</tspan>}
      </text>
    </g>
  );
}

function useSvgExport(svgRef, filename) {
  return useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    let svgStr = serializer.serializeToString(svg);
    if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const scale = 3;
    const rect = svg.getBoundingClientRect();
    const w = Math.round(rect.width * scale);
    const h = Math.round(rect.height * scale);
    svgStr = svgStr.replace(/width="100%"/, `width="${w}"`);
    if (!svgStr.includes('height="')) svgStr = svgStr.replace("<svg", `<svg height="${h}"`);
    const base64 = btoa(unescape(encodeURIComponent(svgStr)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      const link = document.createElement("a");
      link.download = filename + ".png";
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };
    img.onerror = () => {
      const link = document.createElement("a");
      link.download = filename + ".svg";
      link.href = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml" }));
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };
    img.src = dataUrl;
  }, [svgRef, filename]);
}

// Greedy label placement: try candidate positions around each point, avoid
// dots, already-placed labels and the plot edges.
const CANDIDATES = [
  { dx: 16, dy: 5, a: "start" }, { dx: -16, dy: 5, a: "end" },
  { dx: 0, dy: -15, a: "middle" }, { dx: 0, dy: 26, a: "middle" },
  { dx: 11, dy: -11, a: "start" }, { dx: -11, dy: -11, a: "end" },
  { dx: 11, dy: 22, a: "start" }, { dx: -11, dy: 22, a: "end" },
];
function boxOf(x, y, a, w, fs) {
  const x0 = a === "end" ? x - w - 3 : a === "middle" ? x - w / 2 - 3 : x - 3;
  return { x0, y0: y - fs + 1, x1: x0 + w + 6, y1: y + 6 };
}
const overlap = (r, s) =>
  Math.max(0, Math.min(r.x1, s.x1) - Math.max(r.x0, s.x0)) * Math.max(0, Math.min(r.y1, s.y1) - Math.max(r.y0, s.y0));
function placeLabels(items, bounds, dots, rects = []) {
  const taken = dots.map(d => ({ x0: d.x - 11, y0: d.y - 11, x1: d.x + 11, y1: d.y + 11 })).concat(rects);
  return items.map(it => {
    const fs = it.fontSize || 14;
    const w = labelWidth(it.text, it.sub, fs);
    const cands = it.prefer ? [...it.prefer, ...CANDIDATES] : CANDIDATES;
    let best = null;
    for (const c of cands) {
      const lx = it.x + c.dx, ly = it.y + c.dy;
      const b = boxOf(lx, ly, c.a, w, fs);
      const out = b.x0 < bounds.x0 || b.x1 > bounds.x1 || b.y0 < bounds.y0 || b.y1 > bounds.y1;
      const cost = (out ? 1e6 : 0) + taken.reduce((acc, t) => acc + overlap(b, t), 0);
      if (!best || cost < best.cost) best = { lx, ly, a: c.a, b, cost };
      if (cost === 0) break;
    }
    taken.push(best.b);
    return { ...it, lx: best.lx, ly: best.ly, anchor: best.a };
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
const CSS = `
.taf-wrap{max-width:800px;margin:0 auto;padding-block:20px 28px;font-family:${FONT};color:${C.dark}}
.taf-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.taf-main{display:flex;gap:14px;align-items:stretch}
.taf-side{width:210px;flex-shrink:0;display:flex;flex-direction:column;gap:12px}
.taf-chart{flex:1;min-width:0}
.taf-sliders{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 22px}
.taf-table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.taf-table th{font-size:11px;font-weight:700;letter-spacing:.4px;color:${C.gray};text-align:right;padding:6px 8px;border-bottom:1px solid ${C.grayMid}}
.taf-table th:first-child,.taf-table td:first-child{text-align:left}
.taf-table td{padding:6px 8px;text-align:right;border-bottom:1px solid ${C.grayLight};white-space:nowrap}
.taf-btn{border:1px solid ${C.grayMid};background:${C.white};color:${C.darkSoft};border-radius:4px;font:600 12px ${FONT};padding:4px 0;cursor:pointer}
.taf-btn:hover{border-color:${C.dark};color:${C.dark}}
.taf-btn[aria-pressed="true"]{background:${C.dark};border-color:${C.dark};color:${C.white}}
.taf-wrap button:focus-visible,.taf-wrap input:focus-visible{outline:2px solid ${C.blue};outline-offset:2px}
  .taf-steps{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px;align-items:baseline}
.taf-steps>b{white-space:nowrap;color:${C.dark}}
@media (max-width:660px){
  .taf-steps{grid-template-columns:minmax(0,1fr);gap:0}
  .taf-steps>div{margin-bottom:6px}
  .taf-cards{grid-template-columns:repeat(2,minmax(0,1fr))}
  .taf-main{flex-direction:column}
  .taf-side{width:auto}
  .taf-sliders{grid-template-columns:minmax(0,1fr)}
}
`;

const W = 680, H = 440;
const M = { l: 60, r: 18, t: 16, b: 52 };

export default function TwoAssetFrontier() {
  const [p, setP] = useState(DEFAULTS);
  const [shortSales, setShortSales] = useState(true);
  const [showRef, setShowRef] = useState(false);
  const [hover, setHover] = useState(null);
  const set = k => v => setP(prev => ({ ...prev, [k]: v }));

  const svgRef = useRef(null);
  const exportPng = useSvgExport(svgRef, "two_asset_frontier");

  const r = useMemo(() => solve(p, shortSales), [p, shortSales]);

  // Axes depend on asset inputs and target only, so they stay fixed while ρ moves
  const xMax = Math.max(15, niceCeil(Math.max(p.sB, p.sE) * 1.45, 5));
  const yMax = niceCeil(Math.max(p.EB, p.EE, p.target, p.rf) + 3, 2);
  const yMin = Math.min(0, niceFloor(Math.min(p.EB, p.EE, p.rf) - 3, 2));
  const sx = v => M.l + (v / xMax) * (W - M.l - M.r);
  const sy = v => H - M.b - ((v - yMin) / (yMax - yMin)) * (H - M.t - M.b);
  const inPlot = (s, e) => s >= 0 && s <= xMax && e >= yMin && e <= yMax;

  // Frontier samples
  const samples = useMemo(() => {
    const [lo, hi, n] = shortSales ? [-2, 3, 900] : [0, 1, 300];
    const out = [];
    for (let i = 0; i <= n; i++) out.push(stats(lo + ((hi - lo) * i) / n, p));
    return out;
  }, [p, shortSales]);

  const toPath = pts => pts.map((q, i) => `${i ? "L" : "M"}${sx(q.s).toFixed(1)},${sy(q.E).toFixed(1)}`).join("");
  const eff = samples.filter(q => q.E >= r.mvp.E - 1e-9);
  const ineff = samples.filter(q => q.E <= r.mvp.E + 1e-9);
  const effPath = toPath(eff), ineffPath = toPath(ineff);

  const refCurves = useMemo(() => [-1, 0, 1].map(rho => {
    const pts = [];
    for (let i = 0; i <= 200; i++) pts.push(stats(i / 200, { ...p, rho }));
    return { rho, pts };
  }), [p]);

  // CAL
  const tpOk = r.tp && r.tpStatus === "ok";
  const S = tpOk ? r.tp.sharpe : null;
  const calEnd = tpOk ? { s: xMax, E: p.rf + S * xMax } : null;

  // Points and labels
  const pts = [];
  pts.push({ key: "rf", s: 0, E: p.rf, color: C.green, text: "R", sub: "f" });
  pts.push({ key: "B", s: p.sB, E: p.EB, color: C.darkSoft, text: "Bond fund" });
  pts.push({ key: "E", s: p.sE, E: p.EE, color: C.darkSoft, text: "Equity fund" });
  pts.push({ key: "mvp", s: r.mvp.s, E: r.mvp.E, color: AMBER, text: "MVP" });
  if (tpOk) pts.push({ key: "tp", s: r.tp.s, E: r.tp.E, color: C.red, text: "TP" });
  if (r.cp) pts.push({ key: "cp", s: r.cp.s, E: r.cp.E, color: C.blue, text: "C (optimal)" });
  if (r.ro && r.ro.feasible) pts.push({ key: "ro", s: r.ro.s, E: r.ro.E, color: C.blue, text: "Risky only", hollow: true, fontSize: 12 });
  const visible = pts.filter(q => inPlot(q.s, q.E)).map(q => ({ ...q, x: sx(q.s), y: sy(q.E) }));

  const order = ["tp", "mvp", "cp", "rf", "B", "E", "ro"];
  const labelItems = order.map(k => visible.find(q => q.key === k)).filter(Boolean)
    .map(q => ({ ...q, fontSize: q.fontSize || 14 }));
  if (tpOk) {
    const sLab = Math.min(xMax * 0.9, (yMax - p.rf) / S * 0.9);
    labelItems.push({ key: "cal", x: sx(sLab), y: sy(p.rf + S * sLab), text: `CAL  (S = ${num(S, 3)})`,
      color: C.darkSoft, fontSize: 12, prefer: [{ dx: -8, dy: -10, a: "end" }, { dx: 8, dy: 18, a: "start" }] });
  }
  if (showRef) refCurves.forEach(c => {
    const q = c.pts[c.rho === -1 ? 150 : 100];
    if (inPlot(q.s, q.E)) labelItems.push({ key: `ref${c.rho}`, x: sx(q.s), y: sy(q.E),
      text: `ρ = ${c.rho === -1 ? "−1" : c.rho === 1 ? "+1" : "0"}`, color: C.gray, fontSize: 12, weight: 600 });
  });
  const legendBox = { x0: M.l + 6, y0: M.t + 4, x1: M.l + 186, y1: M.t + (showRef ? 82 : 66) };
  const placed = placeLabels(labelItems,
    { x0: M.l + 2, y0: M.t + 2, x1: W - M.r - 2, y1: H - M.b - 2 },
    visible, [legendBox]);

  // Hover
  const onMove = e => {
    const svg = svgRef.current;
    if (!svg || !svg.getScreenCTM) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    let best = null, bd = 30;
    for (const s of samples) {
      if (!inPlot(s.s, s.E)) continue;
      const d = Math.hypot(sx(s.s) - q.x, sy(s.E) - q.y);
      if (d < bd) { bd = d; best = s; }
    }
    setHover(best);
  };

  const xTicks = []; for (let v = 0; v <= xMax + 1e-9; v += 5) xTicks.push(v);
  const yTicks = []; for (let v = yMin; v <= yMax + 1e-9; v += 2) yTicks.push(v);

  const sep = <span style={{ margin: "0 10px", color: C.grayMid }}>|</span>;

  // Status message for edge cases
  let status = null;
  if (r.tpStatus === "none") status = `With unrestricted short sales there is no tangency portfolio: E(R<sub>MVP</sub>) = ${pct(r.mvp.E)} ≤ R<sub>f</sub> = ${pct(p.rf, 1)}${Number.isFinite(r.rhoCrit) && r.rhoCrit <= 1 ? ` (this happens for ρ ≥ ${num(r.rhoCrit, 2)})` : ""}. The Sharpe ratio keeps rising along the upper branch towards its asymptote. Switch short sales off to see the constrained optimum.`;
  else if (r.tpStatus === "arbitrage") status = `At ρ = −1 the MVP is riskless and earns ${pct(r.mvp.E)} ${r.mvp.E > p.rf ? "&gt;" : "&lt;"} R<sub>f</sub>: an arbitrage, so the Sharpe ratio is unbounded.`;
  else if (r.tpStatus === "cash") status = `No long-only mix of the two funds earns more than R<sub>f</sub>: cash dominates.`;

  const tpFormulaClamped = !shortSales && tpOk && Math.abs(r.tp.wB - r.wB_tpFormula) > 5e-4;
  const mvpClamped = !shortSales && Math.abs(r.mvp.wE - r.wE_mvpRaw) > 1e-9;

  const rows = [
    { name: "Bond fund", wB: 1, wE: 0, wC: 0, ...stats(0, p), color: C.darkSoft },
    { name: "Equity fund", wB: 0, wE: 1, wC: 0, ...stats(1, p), color: C.darkSoft },
    { name: "Minimum-variance portfolio (MVP)", wB: r.mvp.wB, wE: r.mvp.wE, wC: 0, E: r.mvp.E, s: r.mvp.s, color: AMBER },
    tpOk ? { name: "Tangency portfolio (TP)", wB: r.tp.wB, wE: r.tp.wE, wC: 0, E: r.tp.E, s: r.tp.s, color: C.red } : null,
    r.ro ? { name: `Risky only, E(R) = ${pct(p.target, 1)}`, wB: r.ro.wB, wE: r.ro.wE, wC: 0, E: r.ro.E, s: r.ro.s, color: C.blue, note: r.ro.feasible ? null : "needs short sale" } : null,
    r.cp ? { name: `Optimal C on CAL, E(R) = ${pct(p.target, 1)}`, wB: r.cp.wB, wE: r.cp.wE, wC: r.cp.wC, E: r.cp.E, s: r.cp.s, color: C.blue, bold: true } : null,
  ].filter(Boolean);

  const toggle = (on, setOn, label, id) => (
    <label htmlFor={id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: C.darkSoft, cursor: "pointer", lineHeight: 1.35 }}>
      <input id={id} type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} style={{ accentColor: C.dark, marginTop: 2 }} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="taf-wrap">
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        borderBottom: `3px solid ${C.yellow}`, paddingBottom: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>Two-Asset Mean-Variance Frontier</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Bond fund + equity fund, with cash as the risk-free asset</div>
        </div>
        <button onClick={exportPng} style={{
          padding: "7px 16px", background: C.dark, color: C.white, border: "none", borderRadius: 4,
          fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "#000")}
          onMouseLeave={e => (e.currentTarget.style.background = C.dark)}
        >⬇ Export PNG</button>
      </div>

      {/* Metric cards */}
      <div className="taf-cards">
        <MetricCard label="MVP: σ<sub>MVP</sub>" value={pct(r.mvp.s)} accent={AMBER}
          sub={`E(R) ${pct(r.mvp.E)} · bond ${wpct(r.mvp.wB)} · equity ${wpct(r.mvp.wE)}`} />
        <MetricCard label="TP: Sharpe ratio" value={tpOk ? num(r.tp.sharpe, 3) : r.tpStatus === "arbitrage" ? "∞" : "–"} accent={C.red}
          sub={tpOk ? `bond ${wpct(r.tp.wB)} · equity ${wpct(r.tp.wE)}` : "no tangency portfolio"} />
        <MetricCard label={`Optimal σ<sub>C</sub> at ${pct(p.target, 1)}`} value={r.cp ? pct(r.cp.s) : "–"} accent={C.blue}
          sub={r.cp && r.ro ? `risky-only mix: ${r.ro.feasible ? pct(r.ro.s) : "not feasible"}` : ""} />
        <MetricCard label="Cash position (1 − y)" value={r.cp ? wpct(r.cp.wC) : "–"} accent={C.green}
          sub={r.cp ? (r.cp.wC < 0 ? `borrow · y = ${num(r.cp.y, 3)} in TP` : `lend · y = ${num(r.cp.y, 3)} in TP`) : ""} />
      </div>

      {/* Side panel + chart */}
      <div className="taf-main">
        <div className="taf-side">
          <div style={{ background: C.yellowSoft, border: `2px solid ${C.yellow}`, borderRadius: 6, padding: "14px 14px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.darkSoft, letterSpacing: 0.4 }}>Correlation ρ</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.dark, lineHeight: 1.1, margin: "4px 0 6px", fontVariantNumeric: "tabular-nums" }}>
              {p.rho >= 0 ? "+" : "−"}{Math.abs(p.rho).toFixed(2)}
            </div>
            <input id="rho" type="range" min={-1} max={1} step={0.01} value={p.rho}
              onChange={e => set("rho")(parseFloat(e.target.value))}
              aria-label="Correlation between bond and equity fund"
              style={{ width: "100%", accentColor: C.dark }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, margin: "8px 0" }}>
              {[-1, 0, 0.2, 1].map(v => (
                <button key={v} className="taf-btn" aria-pressed={Math.abs(p.rho - v) < 1e-9} onClick={() => set("rho")(v)}>
                  {v === -1 ? "−1" : v === 1 ? "+1" : v === 0 ? "0" : v.toFixed(1)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.darkSoft, lineHeight: 1.4, borderTop: `1px solid ${C.yellowMid}`, paddingTop: 8 }}>
              Lower ρ bends the frontier further to the left. Covariance σ<sub>BE</sub> = ρσ<sub>B</sub>σ<sub>E</sub> = <b>{num(r.cov, 1)}</b> %².
            </div>
          </div>

          <div style={{ background: C.grayLight, borderRadius: 6, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {toggle(shortSales, setShortSales, "Allow short sales (weights outside 0–100%)", "short")}
            {toggle(showRef, setShowRef, "Show reference curves for ρ = −1, 0, +1 (long-only)", "ref")}
            <button className="taf-btn" style={{ padding: "6px 0" }} onClick={() => { setP(DEFAULTS); setShortSales(true); setShowRef(false); }}>
              Reset to exercise data
            </button>
          </div>
        </div>

        <div className="taf-chart">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" fontFamily={FONT}
            onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ display: "block", touchAction: "pan-y" }}>
            <rect width={W} height={H} fill={C.white} />
            <defs>
              <clipPath id="taf-plot"><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath>
            </defs>

            {/* grid */}
            {xTicks.map(v => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} stroke={C.grayLight} strokeWidth={1} />)}
            {yTicks.map(v => <line key={`gy${v}`} x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke={C.grayLight} strokeWidth={1} />)}
            {yMin < 0 && <line x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)} stroke={C.grayMid} strokeWidth={1} />}

            {/* axes */}
            <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke={C.dark} strokeWidth={1.2} />
            <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke={C.dark} strokeWidth={1.2} />
            {xTicks.map(v => <text key={`tx${v}`} x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize={13} fill={C.darkSoft}>{v}%</text>)}
            {yTicks.map(v => <text key={`ty${v}`} x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize={13} fill={C.darkSoft}>{v}%</text>)}
            <text x={(M.l + W - M.r) / 2} y={H - 10} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.darkSoft}>Standard deviation σ</text>
            <text transform={`translate(16 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.darkSoft}>Expected return E(R)</text>

            <g clipPath="url(#taf-plot)">
              {/* reference curves */}
              {showRef && refCurves.map(c => (
                <path key={c.rho} d={toPath(c.pts)} fill="none" stroke={C.gray} strokeWidth={1.4} strokeDasharray={c.rho === 0 ? "none" : "2 3"} />
              ))}

              {/* target line */}
              {r.cp && <line x1={M.l} x2={sx(Math.max(r.cp.s, r.ro && r.ro.feasible ? r.ro.s : 0))} y1={sy(p.target)} y2={sy(p.target)}
                stroke={C.blue} strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.6} />}

              {/* frontier */}
              <path d={ineffPath} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="6 5" strokeOpacity={0.55} />
              <path d={effPath} fill="none" stroke={C.red} strokeWidth={3} />

              {/* CAL */}
              {tpOk && <line x1={sx(0)} y1={sy(p.rf)} x2={sx(calEnd.s)} y2={sy(calEnd.E)} stroke={C.dark} strokeOpacity={0.65} strokeWidth={2} />}

              {/* hover point */}
              {hover && <circle cx={sx(hover.s)} cy={sy(hover.E)} r={6} fill={C.white} stroke={C.red} strokeWidth={2.5} />}

              {/* dots */}
              {visible.map(q => q.hollow
                ? <circle key={q.key} cx={q.x} cy={q.y} r={7} fill={C.white} stroke={q.color} strokeWidth={2.5} />
                : <circle key={q.key} cx={q.x} cy={q.y} r={9} fill={q.color} stroke={C.white} strokeWidth={2.5} />)}
            </g>

            {/* legend */}
            <g>
              <rect x={legendBox.x0} y={legendBox.y0} width={legendBox.x1 - legendBox.x0} height={legendBox.y1 - legendBox.y0} rx={3} fill={C.white} fillOpacity={0.9} stroke={C.grayMid} strokeOpacity={0.6} />
              <line x1={legendBox.x0 + 10} x2={legendBox.x0 + 34} y1={legendBox.y0 + 16} y2={legendBox.y0 + 16} stroke={C.red} strokeWidth={3} />
              <text x={legendBox.x0 + 42} y={legendBox.y0 + 20} fontSize={12} fill={C.darkSoft}>Efficient frontier</text>
              <line x1={legendBox.x0 + 10} x2={legendBox.x0 + 34} y1={legendBox.y0 + 32} y2={legendBox.y0 + 32} stroke={C.red} strokeWidth={2} strokeDasharray="6 5" strokeOpacity={0.55} />
              <text x={legendBox.x0 + 42} y={legendBox.y0 + 36} fontSize={12} fill={C.darkSoft}>Inefficient branch</text>
              <line x1={legendBox.x0 + 10} x2={legendBox.x0 + 34} y1={legendBox.y0 + 48} y2={legendBox.y0 + 48} stroke={C.dark} strokeOpacity={0.65} strokeWidth={2} />
              <text x={legendBox.x0 + 42} y={legendBox.y0 + 52} fontSize={12} fill={C.darkSoft}>Capital allocation line</text>
              {showRef && <>
                <line x1={legendBox.x0 + 10} x2={legendBox.x0 + 34} y1={legendBox.y0 + 64} y2={legendBox.y0 + 64} stroke={C.gray} strokeWidth={1.4} strokeDasharray="2 3" />
                <text x={legendBox.x0 + 42} y={legendBox.y0 + 68} fontSize={12} fill={C.darkSoft}>Reference ρ, long-only</text>
              </>}
            </g>

            {/* labels last, on top */}
            {placed.map(l => (
              <ChartLabel key={`l-${l.key}`} x={l.lx} y={l.ly} text={l.text} sub={l.sub} color={l.color}
                anchor={l.anchor} fontSize={l.fontSize} weight={l.weight || 700} />
            ))}
          </svg>

          {/* hover readout */}
          <div style={{ fontSize: 12, color: hover ? C.dark : C.gray, padding: "6px 4px 0", minHeight: 22, fontVariantNumeric: "tabular-nums" }}>
            {hover
              ? <>Bond <b>{wpct(hover.wB)}</b> · Equity <b>{wpct(hover.wE)}</b>{sep}σ <b>{pct(hover.s)}</b> · E(R) <b>{pct(hover.E)}</b>{sep}Sharpe <b>{hover.s > 1e-9 ? num((hover.E - p.rf) / hover.s, 3) : "–"}</b></>
              : "Hover over the frontier to read off the weights of any portfolio."}
          </div>
          {status && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 4, fontSize: 12, color: C.dark, lineHeight: 1.45 }}
              dangerouslySetInnerHTML={{ __html: status }} />
          )}
        </div>
      </div>

      {/* Secondary sliders */}
      <div style={{ background: C.grayLight, borderRadius: 6, padding: "14px 16px", marginTop: 16 }}>
        <div className="taf-sliders">
          <SliderControl id="EB" label="E(R<sub>B</sub>) bond fund" value={p.EB} min={0} max={8} step={0.25} onChange={set("EB")}
            fmt={v => v.toFixed(2) + "%"} color={C.darkSoft} description="Expected return of the bond fund" />
          <SliderControl id="EE" label="E(R<sub>E</sub>) equity fund" value={p.EE} min={2} max={14} step={0.25} onChange={set("EE")}
            fmt={v => v.toFixed(2) + "%"} color={C.red} description="Expected return of the equity fund" />
          <SliderControl id="rf" label="R<sub>f</sub> cash" value={p.rf} min={0} max={4} step={0.25} onChange={set("rf")}
            fmt={v => v.toFixed(2) + "%"} color={C.green} description="Risk-free rate; lending and borrowing at the same rate" />
          <SliderControl id="sB" label="σ<sub>B</sub> bond fund" value={p.sB} min={2} max={20} step={0.5} onChange={set("sB")}
            fmt={v => v.toFixed(1) + "%"} color={C.darkSoft} description="Volatility of the bond fund" />
          <SliderControl id="sE" label="σ<sub>E</sub> equity fund" value={p.sE} min={5} max={30} step={0.5} onChange={set("sE")}
            fmt={v => v.toFixed(1) + "%"} color={C.red} description="Volatility of the equity fund" />
          <SliderControl id="target" label="Target E(R<sub>C</sub>)" value={p.target} min={1} max={12} step={0.25} onChange={set("target")}
            fmt={v => v.toFixed(2) + "%"} color={C.blue} description="Required return of the complete portfolio C" />
        </div>
      </div>

      {/* Solution table */}
      <div style={{ marginTop: 16, overflowX: "auto", border: `1px solid ${C.grayMid}40`, borderRadius: 6, padding: "6px 8px" }}>
        <table className="taf-table">
          <thead>
            <tr><th>Portfolio</th><th>Bond</th><th>Equity</th><th>Cash</th><th>E(R)</th><th>σ</th><th>Sharpe</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} style={{ fontWeight: row.bold ? 700 : 400 }}>
                <td><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: row.color, marginRight: 8 }} />{row.name}
                  {row.note && <span style={{ fontSize: 11, color: C.red, marginLeft: 6 }}>({row.note})</span>}</td>
                <td style={{ color: row.wB < 0 ? C.red : C.dark }}>{wpct(row.wB)}</td>
                <td style={{ color: row.wE < 0 ? C.red : C.dark }}>{wpct(row.wE)}</td>
                <td style={{ color: row.wC < 0 ? C.red : C.dark }}>{wpct(row.wC)}</td>
                <td>{pct(row.E)}</td>
                <td>{pct(row.s)}</td>
                <td>{row.s > 1e-9 ? num((row.E - p.rf) / row.s, 3) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Worked solution / formula bar */}
      <div style={{ marginTop: 12, padding: "12px 16px", background: C.grayBg, border: `1px solid ${C.grayMid}40`, borderRadius: 6,
        fontSize: 13, color: C.darkSoft, lineHeight: 1.75, overflowX: "auto" }}>
        <div style={{ fontWeight: 700, color: C.dark, marginBottom: 4 }}>Worked solution (current inputs, in % and %²)</div>
        <div className="taf-steps">
          <b>1 · Covariance</b>
          <div>σ<sub>BE</sub> = ρ·σ<sub>B</sub>·σ<sub>E</sub> = {num(p.rho, 2)} × {num(p.sB, 1)} × {num(p.sE, 1)} = <b>{num(r.cov, 2)}</b></div>

          <b>2 · MVP</b>
          <div>
            w<sub>B</sub> = (σ<sub>E</sub><sup>2</sup> − σ<sub>BE</sub>) / (σ<sub>B</sub><sup>2</sup> + σ<sub>E</sub><sup>2</sup> − 2σ<sub>BE</sub>)
            <br />= ({num(r.vE, 1)} − {num(r.cov, 2)}) / ({num(r.vB, 1)} + {num(r.vE, 1)} − {num(2 * r.cov, 2)}) = <b>{num(1 - r.wE_mvpRaw, 4)}</b>
            {mvpClamped && <> → long-only: <b>{num(r.mvp.wB, 4)}</b></>}
            <br />→ E(R) = {pct(r.mvp.E)}, σ = {pct(r.mvp.s)}
          </div>

          <b>3 · TP</b>
          <div>
            w<sub>B</sub> = [(E(R<sub>B</sub>)−R<sub>f</sub>)σ<sub>E</sub><sup>2</sup> − (E(R<sub>E</sub>)−R<sub>f</sub>)σ<sub>BE</sub>] / [(E(R<sub>B</sub>)−R<sub>f</sub>)σ<sub>E</sub><sup>2</sup> + (E(R<sub>E</sub>)−R<sub>f</sub>)σ<sub>B</sub><sup>2</sup> − (E(R<sub>B</sub>)−R<sub>f</sub> + E(R<sub>E</sub>)−R<sub>f</sub>)σ<sub>BE</sub>]
            <br />= [{num(r.rB, 2)}×{num(r.vE, 1)} − {num(r.rE, 2)}×{num(r.cov, 2)}] / [{num(r.rB, 2)}×{num(r.vE, 1)} + {num(r.rE, 2)}×{num(r.vB, 1)} − {num(r.rB + r.rE, 2)}×{num(r.cov, 2)}]
            {" "}= {num(r.num, 1)} / {num(r.den, 1)} = <b>{num(r.wB_tpFormula, 4)}</b>
            {tpFormulaClamped && <> → long-only optimum: <b>{num(r.tp.wB, 4)}</b></>}
            <br />
            {tpOk
              ? <>→ E(R) = {pct(r.tp.E)}, σ = {pct(r.tp.s)}, Sharpe = {num(r.tp.sharpe, 3)}</>
              : <span style={{ color: C.red }}>→ denominator ≤ 0: no tangency portfolio on the efficient branch</span>}
          </div>

          <b>4 · Target</b>
          <div>
            y = (E(R<sub>C</sub>) − R<sub>f</sub>) / (E(R<sub>TP</sub>) − R<sub>f</sub>)
            {r.cp ? <> = ({num(p.target, 2)} − {num(p.rf, 2)}) / ({num(r.tp.E, 2)} − {num(p.rf, 2)}) = <b>{num(r.cp.y, 4)}</b>
              <br />→ σ<sub>C</sub> = y·σ<sub>TP</sub> = <b>{pct(r.cp.s)}</b>; bond {wpct(r.cp.wB)}, equity {wpct(r.cp.wE)}, cash {wpct(r.cp.wC)}</> : " – not defined without a tangency portfolio"}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.5, marginTop: 10 }}>
        Every mix of the two funds plots on the red curve. The MVP is its leftmost point; only the solid branch above it is efficient.
        Adding cash, the best risky mix is the tangency portfolio, where the line from R<sub>f</sub> touches the frontier with the steepest slope (highest Sharpe ratio).
        Any target return is reached most cheaply in risk by moving along that line: compare C with the risky-only mix at the same return.
        Cash can be lent or borrowed at R<sub>f</sub>; the short-sale switch only restricts the two fund weights.
      </div>
    </div>
  );
}
