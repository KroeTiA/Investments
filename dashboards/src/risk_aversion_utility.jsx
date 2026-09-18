import { useState, useMemo, useCallback, useRef } from "react";

// ─── FHNW Color Palette ───
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

// ─── Shared SVG Export (base64 approach for sandboxed environments) ───
function useSvgExport(svgRef, filename) {
  return useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    let svgStr = serializer.serializeToString(svg);
    if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const scaleFactor = 3;
    const rect = svg.getBoundingClientRect();
    const w = Math.round(rect.width * scaleFactor);
    const h = Math.round(rect.height * scaleFactor);
    svgStr = svgStr.replace(/width="100%"/, `width="${w}"`);
    if (!svgStr.includes('height="')) {
      svgStr = svgStr.replace('<svg', `<svg height="${h}"`);
    }
    const base64 = btoa(unescape(encodeURIComponent(svgStr)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = filename + ".png";
      link.href = pngUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.onerror = () => {
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.download = filename + ".svg";
      link.href = URL.createObjectURL(svgBlob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = dataUrl;
  }, [svgRef, filename]);
}

// ─── Tab Navigation ───
const TABS = [
  { id: "utility", label: "1 · Utility Function (Wealth)", short: "Utility (Wealth)" },
  { id: "indifference", label: "2 · Mean-Variance Utility Score", short: "MV Utility" },
  { id: "experiment", label: "3 · Your Risk Aversion", short: "Experiment" },
];

// ─── Quadratic Utility: U(W) = W − ½bW² ───
function utilityFn(W, b) {
  return W - 0.5 * b * W * W;
}
// Bliss point (maximum of U): W* = 1/b
function blissPoint(b) {
  return 1 / b;
}

// ─── MV Utility ───
function mvUtility(Er, sigma, A) {
  return Er - 0.5 * A * sigma * sigma;
}

// ─── VIEW 1: UTILITY FUNCTION (U(W) vs W with coin toss) ───
function UtilityView() {
  const svgRef = useRef(null);
  const exportPNG = useSvgExport(svgRef, "utility_function_risk_aversion");

  const [b, setB] = useState(1/23);
  const [Wbad, setWbad] = useState(2);
  const [Wgood, setWgood] = useState(20);
  const [prob, setProb] = useState(0.5);
  const [showMarkups, setShowMarkups] = useState(true);

  const data = useMemo(() => {
    const EW = prob * Wgood + (1 - prob) * Wbad;
    const U_Wbad = utilityFn(Wbad, b);
    const U_Wgood = utilityFn(Wgood, b);
    const EU = prob * U_Wgood + (1 - prob) * U_Wbad;
    const U_EW = utilityFn(EW, b);

    // CE via quadratic formula: U(CE) = EU → CE − ½b·CE² = EU
    // ½b·CE² − CE + EU = 0 → CE = (1 − √(1 − 2b·EU)) / b  (smaller root, in increasing region)
    const disc = 1 - 2 * b * EU;
    let CE;
    if (disc >= 0) {
      CE = (1 - Math.sqrt(disc)) / b;
    } else {
      // Fallback bisection if discriminant is negative
      let lo = 0.001, hi = 1 / b;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (utilityFn(mid, b) < EU) lo = mid; else hi = mid;
      }
      CE = (lo + hi) / 2;
    }
    const RP = EW - CE;
    const Wbliss = blissPoint(b);
    return { EW, U_Wbad, U_Wgood, EU, U_EW, CE, RP, Wbliss };
  }, [b, Wbad, Wgood, prob]);

  const { EW, U_Wbad, U_Wgood, EU, U_EW, CE, RP, Wbliss } = data;

  // SVG layout
  const w = 720, h = 440;
  const pad = { l: 70, r: 40, t: 25, b: 60 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const Wmin = 0, Wmax = 20;
  // Only plot up to bliss point (where U'(W)=0, i.e. concave increasing part)
  const WplotMax = Math.min(Wmax, Wbliss);
  const Usamples = [];
  for (let ww = 0; ww <= WplotMax; ww += 0.1) Usamples.push(utilityFn(ww, b));
  const Umin_raw = Math.min(...Usamples, EU - 0.5, 0);
  const Umax_raw = Math.max(...Usamples, U_EW + 0.5);
  const Upadding = (Umax_raw - Umin_raw) * 0.08;
  const Umin = Umin_raw - Upadding;
  const Umax = Umax_raw + Upadding;

  const sx = (ww) => pad.l + ((ww - Wmin) / (Wmax - Wmin)) * cw;
  const sy = (u) => pad.t + ch - ((u - Umin) / (Umax - Umin)) * ch;

  // U(W) curve — only the increasing (concave) part up to bliss point
  const curvePts = [];
  for (let ww = 0; ww <= WplotMax; ww += 0.1) curvePts.push([ww, utilityFn(ww, b)]);
  const curveD = curvePts.map((p, i) =>
    `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`
  ).join(" ");

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: C.darkSoft, lineHeight: 1.6, margin: "0 0 14px 0" }}>
          The <b>quadratic utility function</b>{" "}
          <span style={{ fontFamily: "monospace", background: C.grayLight, padding: "2px 6px", borderRadius: 4 }}>
          U(W) = W − ½ · b · W²</span>{" "}
          is concave for W &lt; 1/b, implying <b>risk aversion</b>:
          U(E[W]) &gt; E[U(W)] (Jensen's Inequality). The gap determines the <b>certainty equivalent</b> and <b>risk premium</b>.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
          <SliderControl label="b (curvature)" value={b} min={0.005} max={0.08} step={0.001}
            onChange={setB} fmt={v => v.toFixed(3)} color={C.blue} />
          <SliderControl label="W(bad)" value={Wbad} min={0} max={8} step={0.5}
            onChange={setWbad} fmt={v => v.toFixed(1)} color={C.red} />
          <SliderControl label="W(good)" value={Wgood} min={5} max={20} step={0.5}
            onChange={setWgood} fmt={v => v.toFixed(1)} color={C.green} />
          <SliderControl label="p(good)" value={prob} min={0.1} max={0.9} step={0.05}
            onChange={setProb} fmt={v => v.toFixed(2)} color={C.dark} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: C.darkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={showMarkups} onChange={e => setShowMarkups(e.target.checked)}
              style={{ accentColor: C.blue }} />
            Show Annotations (CE, Risk Premium, Jensen's Inequality)
          </label>
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block", fontFamily: "'Aptos', 'Segoe UI', sans-serif" }}>
        <rect width={w} height={h} fill={C.white} rx={6} />

        {/* Grid lines */}
        {[0, 5, 10, 15, 20].map(ww => (
          <g key={`gx${ww}`}>
            <line x1={sx(ww)} y1={pad.t} x2={sx(ww)} y2={pad.t + ch} stroke={C.grayLight} />
            <text x={sx(ww)} y={pad.t + ch + 18} textAnchor="middle" fontSize={11} fill={C.gray}>{ww}</text>
          </g>
        ))}
        {(() => {
          const range = Umax - Umin;
          const step = range > 8 ? 2 : range > 4 ? 1 : range > 1.5 ? 0.5 : 0.2;
          const ticks = [];
          for (let v = Math.ceil(Umin / step) * step; v <= Umax; v += step) ticks.push(v);
          return ticks.map(v => (
            <g key={`gy${v}`}>
              <line x1={pad.l} y1={sy(v)} x2={pad.l + cw} y2={sy(v)} stroke={C.grayLight} />
              <text x={pad.l - 8} y={sy(v) + 4} textAnchor="end" fontSize={10} fill={C.gray}>
                {v.toFixed(step < 1 ? 1 : 0)}
              </text>
            </g>
          ));
        })()}

        {/* Axes labels */}
        <text x={pad.l + cw / 2} y={h - 8} textAnchor="middle" fontSize={13} fill={C.darkSoft} fontWeight={600}>
          Wealth (W)
        </text>
        <text x={16} y={pad.t + ch / 2} textAnchor="middle" fontSize={13} fill={C.darkSoft} fontWeight={600}
          transform={`rotate(-90, 16, ${pad.t + ch / 2})`}>
          Utility U(W)
        </text>

        {/* Risk Premium shading on x-axis region */}
        {showMarkups && RP > 0.05 && (
          <rect x={sx(CE)} y={sy(EU) - 1} width={sx(EW) - sx(CE)} height={pad.t + ch - sy(EU) + 2}
            fill={C.redSoft} />
        )}

        {/* U(W) curve */}
        <path d={curveD} fill="none" stroke={C.grayMid} strokeWidth={2.8} />

        {/* Chord line from (Wbad, U(Wbad)) to (Wgood, U(Wgood)) */}
        <line x1={sx(Wbad)} y1={sy(U_Wbad)} x2={sx(Wgood)} y2={sy(U_Wgood)}
          stroke={C.gray} strokeWidth={1.8} strokeDasharray="8,4" />

        {/* W(bad) point */}
        <circle cx={sx(Wbad)} cy={sy(U_Wbad)} r={6} fill={C.red} />
        <line x1={sx(Wbad)} y1={sy(U_Wbad)} x2={sx(Wbad)} y2={pad.t + ch}
          stroke={C.red} strokeWidth={1} strokeDasharray="3,3" />
        <text x={sx(Wbad)} y={pad.t + ch + 32} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.red}>
          W↓={Wbad.toFixed(1)}
        </text>

        {/* W(good) point */}
        <circle cx={sx(Wgood)} cy={sy(U_Wgood)} r={6} fill={C.green} />
        <line x1={sx(Wgood)} y1={sy(U_Wgood)} x2={sx(Wgood)} y2={pad.t + ch}
          stroke={C.green} strokeWidth={1} strokeDasharray="3,3" />
        <text x={sx(Wgood)} y={pad.t + ch + 32} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.green}>
          W↑={Wgood.toFixed(1)}
        </text>

        {/* E[W] vertical dashed line */}
        <line x1={sx(EW)} y1={Math.min(sy(EU), sy(U_EW)) - 5} x2={sx(EW)} y2={pad.t + ch}
          stroke={C.blue} strokeWidth={1.2} strokeDasharray="4,3" />

        {/* E[U(W)] — point on chord */}
        <circle cx={sx(EW)} cy={sy(EU)} r={6} fill={C.blue} />
        {/* Horizontal dashed from E[U(W)] to y-axis */}
        <line x1={pad.l} y1={sy(EU)} x2={sx(EW)} y2={sy(EU)}
          stroke={C.blue} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
        <text x={pad.l - 8} y={sy(EU) + 4} textAnchor="end" fontSize={10} fontWeight={600} fill={C.blue}>
          E[U]
        </text>
        <text x={sx(EW) + 10} y={sy(EU) + (sy(EU) < sy(U_EW) - 30 ? 16 : -4)}
          fontSize={11} fontWeight={700} fill={C.blue}>
          E[U(W)] = {EU.toFixed(2)}
        </text>

        {/* U(E[W]) — point on curve at E[W] */}
        <circle cx={sx(EW)} cy={sy(U_EW)} r={6} fill={C.yellow} stroke={C.dark} strokeWidth={2} />
        {/* Horizontal dashed from U(E[W]) to y-axis */}
        <line x1={pad.l} y1={sy(U_EW)} x2={sx(EW)} y2={sy(U_EW)}
          stroke={"#B8860B"} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
        <text x={pad.l - 8} y={sy(U_EW) + 4} textAnchor="end" fontSize={10} fontWeight={600} fill={"#B8860B"}>
          U(E[W])
        </text>
        <text x={sx(EW) + 10} y={sy(U_EW) - 10}
          fontSize={11} fontWeight={700} fill={C.dark}>
          U(E[W]) = {U_EW.toFixed(2)}
        </text>

        {/* E[W] x-axis label */}
        <text x={sx(EW)} y={pad.t + ch + 34} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.blue}>
          E[W]={EW.toFixed(1)}
        </text>

        {/* CE — point on curve where U(CE) = E[U(W)] */}
        {showMarkups && (
          <>
            <line x1={sx(CE)} y1={sy(EU)} x2={sx(CE)} y2={pad.t + ch}
              stroke={"#B8860B"} strokeWidth={1.5} strokeDasharray="4,3" />
            <circle cx={sx(CE)} cy={sy(EU)} r={5} fill={C.yellow} stroke={C.dark} strokeWidth={1.5} />
            <text x={sx(CE)} y={pad.t + ch + 34} textAnchor="middle" fontSize={11} fontWeight={700} fill={"#B8860B"}>
              CE={CE.toFixed(1)}
            </text>
          </>
        )}

        {/* Jensen's Inequality vertical annotation */}
        {showMarkups && U_EW > EU + 0.01 && (
          <>
            <line x1={sx(EW) - 7} y1={sy(U_EW) + 8} x2={sx(EW) - 7} y2={sy(EU) - 8}
              stroke={C.blue} strokeWidth={1.5} opacity={0.6}
              markerEnd="url(#arrowBlueDown)" markerStart="url(#arrowBlueUp)" />
            <text x={sx(EW) - 16} y={(sy(U_EW) + sy(EU)) / 2 + 4}
              textAnchor="end" fontSize={10} fill={C.blue} fontStyle="italic">
              Jensen's
            </text>
            <text x={sx(EW) - 16} y={(sy(U_EW) + sy(EU)) / 2 + 16}
              textAnchor="end" fontSize={10} fill={C.blue} fontStyle="italic">
              Inequality
            </text>
          </>
        )}

        {/* Risk Premium bracket slightly above x-axis */}
        {showMarkups && RP > 0.05 && (
          <>
            <line x1={sx(CE)} y1={pad.t + ch - 16} x2={sx(EW)} y2={pad.t + ch - 16}
              stroke={C.red} strokeWidth={2} />
            <line x1={sx(CE)} y1={pad.t + ch - 20} x2={sx(CE)} y2={pad.t + ch - 12}
              stroke={C.red} strokeWidth={2} />
            <line x1={sx(EW)} y1={pad.t + ch - 20} x2={sx(EW)} y2={pad.t + ch - 12}
              stroke={C.red} strokeWidth={2} />
            <text x={(sx(CE) + sx(EW)) / 2} y={pad.t + ch - 22}
              textAnchor="middle" fontSize={10} fontWeight={700} fill={C.red}>
              Risk Premium = {RP.toFixed(2)}
            </text>
          </>
        )}

        {/* Curve label */}
        {(() => {
          const labelW = Math.min(WplotMax - 1, Wmax - 2);
          const labelU = utilityFn(labelW, b);
          return (
            <text x={sx(labelW)} y={sy(labelU) - 12}
              textAnchor="end" fontSize={12} fontWeight={700} fill={C.gray}>
              U(W) = W − ½bW²
            </text>
          );
        })()}

        <defs>
          <marker id="arrowBlueDown" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.blue} opacity={0.6} />
          </marker>
          <marker id="arrowBlueUp" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M6,0 L0,3 L6,6 Z" fill={C.blue} opacity={0.6} />
          </marker>
        </defs>
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "start" }}>
        <div style={{
          fontSize: 13, color: C.darkSoft, lineHeight: 1.8,
          background: C.grayLight, padding: "10px 14px", borderRadius: 8, borderLeft: `4px solid ${C.yellow}`
        }}>
          <b>Coin toss:</b> W↓ = {Wbad} or W↑ = {Wgood} with p = {prob.toFixed(2)} &nbsp;|&nbsp; b = {b.toFixed(3)} &nbsp;|&nbsp; Bliss point: 1/b = {Wbliss.toFixed(1)}<br />
          E[W] = {EW.toFixed(2)} &nbsp;|&nbsp;
          U(E[W]) = <b>{U_EW.toFixed(2)}</b> &nbsp;|&nbsp;
          E[U(W)] = <b style={{ color: C.blue }}>{EU.toFixed(2)}</b><br />
          CE = <b style={{ color: "#B8860B" }}>{CE.toFixed(2)}</b> &nbsp;|&nbsp;
          Risk Premium = E[W] − CE = <b style={{ color: C.red }}>{RP.toFixed(2)}</b>
          {b < 0.006 && <span style={{ marginLeft: 8, color: C.green }}>(≈ Risk-Neutral)</span>}
        </div>
        <ExportBtn onClick={exportPNG} />
      </div>
    </div>
  );
}

// ─── VIEW 2: MEAN-VARIANCE UTILITY SCORE ───
function IndifferenceCurvesView() {
  const svgRef = useRef(null);
  const exportPNG = useSvgExport(svgRef, "mv_utility_score");

  const [A, setA] = useState(4);
  const [Er, setEr] = useState(10);
  const [sigma, setSigma] = useState(20);
  const [sigmaQ, setSigmaQ] = useState(30);

  const erDec = Er / 100;
  const sigmaDec = sigma / 100;
  const U = mvUtility(erDec, sigmaDec, A);

  // Q sits on the same indifference curve: E(r)_Q = U + 0.5*A*sigmaQ^2
  const sigmaQDec = sigmaQ / 100;
  const erQ = U + 0.5 * A * sigmaQDec * sigmaQDec;

  const w = 700, h = 420;
  const pad = { l: 60, r: 30, t: 25, b: 50 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const sigmaMax = 0.40;
  const erMax = 0.25;

  const sx = (s) => pad.l + (s / sigmaMax) * cw;
  const sy = (e) => pad.t + ch - (e / erMax) * ch;

  // Indifference curve through portfolio P: E(r) = U + 0.5*A*sigma^2
  const icPts = useMemo(() => {
    const pts = [];
    for (let sig = 0; sig <= sigmaMax; sig += 0.002) {
      const er = U + 0.5 * A * sig * sig;
      if (er >= 0 && er <= erMax) pts.push([sig, er]);
    }
    return pts;
  }, [U, A]);

  const icD = icPts.length > 1
    ? icPts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ")
    : "";

  // Clamp Q to visible range
  const qVisible = erQ >= 0 && erQ <= erMax && sigmaQDec >= 0 && sigmaQDec <= sigmaMax;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: C.darkSoft, lineHeight: 1.6, margin: "0 0 14px 0" }}>
          The <b>mean-variance utility score</b>{" "}
          <span style={{ fontFamily: "monospace", background: C.grayLight, padding: "2px 6px", borderRadius: 4 }}>
          U = E(r) − ½ · A · σ²</span>{" "}
          penalizes expected return for risk. Portfolios <b>P</b> and <b>Q</b> lie on the same
          indifference curve — they deliver the same utility to this investor.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
          <SliderControl label="Risk Aversion A" value={A} min={0.5} max={10} step={0.5}
            onChange={setA} fmt={v => v.toFixed(1)} color={C.blue} />
          <SliderControl label="E(r) of P %" value={Er} min={0} max={25} step={0.5}
            onChange={setEr} fmt={v => v.toFixed(1) + "%"} color={C.dark} />
          <SliderControl label="σ of P %" value={sigma} min={1} max={40} step={0.5}
            onChange={setSigma} fmt={v => v.toFixed(1) + "%"} color={C.gray} />
          <SliderControl label="σ of Q %" value={sigmaQ} min={1} max={40} step={0.5}
            onChange={setSigmaQ} fmt={v => v.toFixed(1) + "%"} color={C.red} />
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block", fontFamily: "'Aptos', 'Segoe UI', sans-serif" }}>
        <rect width={w} height={h} fill={C.white} rx={6} />

        {[0, 0.1, 0.2, 0.3, 0.4].map(s => (
          <g key={`gx${s}`}>
            <line x1={sx(s)} y1={pad.t} x2={sx(s)} y2={pad.t + ch} stroke={C.grayLight} />
            <text x={sx(s)} y={h - 12} textAnchor="middle" fontSize={11} fill={C.gray}>
              {(s * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {[0, 0.05, 0.10, 0.15, 0.20, 0.25].map(e => (
          <g key={`gy${e}`}>
            <line x1={pad.l} y1={sy(e)} x2={pad.l + cw} y2={sy(e)} stroke={C.grayLight} />
            <text x={pad.l - 8} y={sy(e) + 4} textAnchor="end" fontSize={11} fill={C.gray}>
              {(e * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        <text x={pad.l + cw / 2} y={h - 0} textAnchor="middle" fontSize={12} fill={C.darkSoft}>
          Standard Deviation (σ)
        </text>
        <text x={14} y={pad.t + ch / 2} textAnchor="middle" fontSize={12} fill={C.darkSoft}
          transform={`rotate(-90, 14, ${pad.t + ch / 2})`}>
          Expected Return E(r)
        </text>

        {/* Indifference curve through P */}
        {icD && <path d={icD} fill="none" stroke={C.grayMid} strokeWidth={2} strokeDasharray="6,3" />}
        {/* IC label at right end */}
        {icPts.length > 1 && (() => {
          const lastPt = icPts[icPts.length - 1];
          return (
            <text x={lastPt[0] >= sigmaMax - 0.01 ? sx(sigmaMax) + 4 : sx(lastPt[0]) + 4}
              y={sy(lastPt[1]) + 4} fontSize={10} fill={C.gray} fontWeight={600}>
              U = {(U * 100).toFixed(1)}%
            </text>
          );
        })()}

        {/* E(r) horizontal dashed to P */}
        <line x1={pad.l} y1={sy(erDec)} x2={sx(sigmaDec)} y2={sy(erDec)}
          stroke={C.blue} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
        {/* sigma vertical dashed to P */}
        <line x1={sx(sigmaDec)} y1={sy(erDec)} x2={sx(sigmaDec)} y2={pad.t + ch}
          stroke={C.blue} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />

        {/* Portfolio P */}
        <circle cx={sx(sigmaDec)} cy={sy(erDec)} r={8} fill={C.yellow} stroke={C.dark} strokeWidth={2} />
        <text x={sx(sigmaDec) + 12} y={sy(erDec) - 10} fontSize={12} fontWeight={800} fill={C.dark}>
          P
        </text>
        <text x={sx(sigmaDec) + 12} y={sy(erDec) + 5} fontSize={10} fill={C.darkSoft}>
          E(r) = {Er.toFixed(1)}%, σ = {sigma.toFixed(1)}%
        </text>

        {/* Portfolio Q on the indifference curve */}
        {qVisible && (
          <>
            {/* E(r) horizontal dashed to Q */}
            <line x1={pad.l} y1={sy(erQ)} x2={sx(sigmaQDec)} y2={sy(erQ)}
              stroke={C.red} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
            {/* sigma vertical dashed to Q */}
            <line x1={sx(sigmaQDec)} y1={sy(erQ)} x2={sx(sigmaQDec)} y2={pad.t + ch}
              stroke={C.red} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />

            <circle cx={sx(sigmaQDec)} cy={sy(erQ)} r={8} fill={C.red} stroke={C.dark} strokeWidth={2} />
            <text x={sx(sigmaQDec) + 12} y={sy(erQ) - 10} fontSize={12} fontWeight={800} fill={C.dark}>
              Q
            </text>
            <text x={sx(sigmaQDec) + 12} y={sy(erQ) + 5} fontSize={10} fill={C.darkSoft}>
              E(r) = {(erQ * 100).toFixed(1)}%, σ = {sigmaQ.toFixed(1)}%
            </text>
          </>
        )}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "start" }}>
        <div style={{
          fontSize: 13, color: C.darkSoft, lineHeight: 1.8,
          background: C.grayLight, padding: "10px 14px", borderRadius: 8, borderLeft: `4px solid ${C.yellow}`
        }}>
          <b>P:</b> U = {Er.toFixed(1)}% − ½ × {A.toFixed(1)} × ({sigma.toFixed(1)}%)² = <b style={{ color: C.blue }}>{(U * 100).toFixed(1)}%</b><br />
          {qVisible && (
            <><b>Q:</b> U = {(erQ * 100).toFixed(1)}% − ½ × {A.toFixed(1)} × ({sigmaQ.toFixed(1)}%)² = <b style={{ color: C.blue }}>{(mvUtility(erQ, sigmaQDec, A) * 100).toFixed(1)}%</b>
            &nbsp; — same utility, different risk–return trade-off</>
          )}
          {!qVisible && <span style={{ color: C.red }}>Q is outside the visible range — adjust σ of Q</span>}
        </div>
        <ExportBtn onClick={exportPNG} />
      </div>
    </div>
  );
}

// ─── VIEW 3: EXPERIMENT — Holt & Laury inspired ───
const RF = 0.04; // risk-free rate 4%
const ER = 0.10; // all gambles have E(r) = 10%
// Gambles ordered from most risky (high σ) to least risky (low σ)
// For 50/50: R_H = E(r)+σ, R_L = E(r)−σ
// At indifference: A_crit = 2*(E(r)−r_f) / σ²
const GAMBLES = [
  { id: 1, sigma: 0.40, Rh: 0.50, Rl: -0.30 },
  { id: 2, sigma: 0.30, Rh: 0.40, Rl: -0.20 },
  { id: 3, sigma: 0.25, Rh: 0.35, Rl: -0.15 },
  { id: 4, sigma: 0.20, Rh: 0.30, Rl: -0.10 },
  { id: 5, sigma: 0.15, Rh: 0.25, Rl: -0.05 },
  { id: 6, sigma: 0.12, Rh: 0.22, Rl: -0.02 },
  { id: 7, sigma: 0.10, Rh: 0.20, Rl:  0.00 },
  { id: 8, sigma: 0.07, Rh: 0.17, Rl:  0.03 },
].map(g => ({ ...g, Acrit: 2 * (ER - RF) / (g.sigma * g.sigma) }));

const fmtPct = (v) => (v >= 0 ? "+" : "") + (v * 100).toFixed(0) + "%";

function ExperimentView() {
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (id, choice) => {
    setAnswers(prev => ({ ...prev, [id]: choice }));
    setShowResult(false);
  };

  // Check consistency and compute A
  const hasIndifferent = useMemo(() => {
    return GAMBLES.some(g => answers[g.id] === "indifferent");
  }, [answers]);

  // Consistent ordering: as σ decreases (rows go down), choices should go
  // safe → indifferent → gamble (never back to safe after gamble/indifferent)
  const isConsistent = useMemo(() => {
    const n = GAMBLES.length;
    const answered = GAMBLES.filter(g => answers[g.id]);
    if (answered.length < n) return true; // don't flag while incomplete
    // Map choices to numeric order: safe=0, indifferent=1, gamble=2
    const order = { safe: 0, indifferent: 1, gamble: 2 };
    const vals = GAMBLES.map(g => order[answers[g.id]]);
    // Must be non-decreasing
    for (let i = 1; i < n; i++) {
      if (vals[i] < vals[i - 1]) return false;
    }
    return true;
  }, [answers]);

  // Find the switch point
  const estimatedA = useMemo(() => {
    const n = GAMBLES.length;
    const answered = GAMBLES.filter(g => answers[g.id]);
    if (answered.length < n) return null;
    if (!isConsistent) return null;
    if (!hasIndifferent) return null;

    // Use the first "indifferent" row → A = Acrit exactly
    for (let i = 0; i < n; i++) {
      if (answers[GAMBLES[i].id] === "indifferent") {
        return GAMBLES[i].Acrit;
      }
    }
    return null;
  }, [answers, isConsistent, hasIndifferent]);

  const allAnswered = Object.keys(answers).length === GAMBLES.length;

  return (
    <div>
      <p style={{ fontSize: 14, color: C.darkSoft, lineHeight: 1.6, margin: "0 0 6px 0" }}>
        You invest your entire portfolio. The <b>risky option</b> pays R<sup>H</sup> or R<sup>L</sup> with
        equal probability (50/50). All gambles have <b>E(r) = 10%</b> but different risk (σ).
        The <b>safe option</b> pays the risk-free rate <b>r<sub>f</sub> = 4%</b> for certain.
      </p>
      <p style={{ fontSize: 13, color: C.gray, margin: "0 0 16px 0", fontStyle: "italic" }}>
        For each gamble, choose "Safe", "Gamble", or "Indiff." if you are exactly indifferent. The indifference point reveals your A.
      </p>

      {/* Table-style layout */}
      <div style={{
        border: `1px solid ${C.grayMid}`, borderRadius: 8, overflow: "hidden", marginBottom: 20,
      }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "44px 1fr 80px 80px 60px 200px",
          background: C.dark, color: C.white, fontSize: 11, fontWeight: 700,
          padding: "8px 12px", gap: 8, alignItems: "center",
        }}>
          <span>#</span>
          <span>Risky Option (50/50)</span>
          <span style={{ textAlign: "center" }}>E(r)</span>
          <span style={{ textAlign: "center" }}>σ</span>
          <span></span>
          <span style={{ textAlign: "center" }}>Your Choice</span>
        </div>

        {GAMBLES.map((g, idx) => {
          const selected = answers[g.id];
          return (
            <div key={g.id} style={{
              display: "grid", gridTemplateColumns: "44px 1fr 80px 80px 60px 200px",
              padding: "10px 12px", gap: 8, alignItems: "center",
              background: idx % 2 === 0 ? C.white : C.grayBg,
              borderTop: `1px solid ${C.grayLight}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.darkSoft }}>{g.id}</span>
              <span style={{ fontSize: 13, color: C.darkSoft }}>
                R<sup>H</sup> = <span style={{ color: C.green, fontWeight: 600 }}>{fmtPct(g.Rh)}</span>,{" "}
                R<sup>L</sup> = <span style={{ color: g.Rl < 0 ? C.red : C.darkSoft, fontWeight: 600 }}>{fmtPct(g.Rl)}</span>
              </span>
              <span style={{ textAlign: "center", fontSize: 12, color: C.darkSoft }}>{(ER * 100).toFixed(0)}%</span>
              <span style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: C.darkSoft }}>{(g.sigma * 100).toFixed(0)}%</span>
              <span style={{ textAlign: "center", fontSize: 11, color: C.gray }}>or r<sub>f</sub></span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => handleAnswer(g.id, "safe")}
                  style={{
                    flex: 1, padding: "5px 6px", fontSize: 11, fontWeight: selected === "safe" ? 700 : 500,
                    border: `2px solid ${selected === "safe" ? C.blue : C.grayMid}`,
                    borderRadius: 5, cursor: "pointer", transition: "all 0.15s",
                    background: selected === "safe" ? C.blueLight : C.white,
                    color: selected === "safe" ? C.blue : C.darkSoft,
                  }}>Safe</button>
                <button onClick={() => handleAnswer(g.id, "indifferent")}
                  style={{
                    flex: 1, padding: "5px 6px", fontSize: 11, fontWeight: selected === "indifferent" ? 700 : 500,
                    border: `2px solid ${selected === "indifferent" ? "#B8860B" : C.grayMid}`,
                    borderRadius: 5, cursor: "pointer", transition: "all 0.15s",
                    background: selected === "indifferent" ? C.yellowSoft : C.white,
                    color: selected === "indifferent" ? "#B8860B" : C.darkSoft,
                  }}>Indiff.</button>
                <button onClick={() => handleAnswer(g.id, "gamble")}
                  style={{
                    flex: 1, padding: "5px 6px", fontSize: 11, fontWeight: selected === "gamble" ? 700 : 500,
                    border: `2px solid ${selected === "gamble" ? C.yellow : C.grayMid}`,
                    borderRadius: 5, cursor: "pointer", transition: "all 0.15s",
                    background: selected === "gamble" ? C.yellowSoft : C.white,
                    color: selected === "gamble" ? C.dark : C.darkSoft,
                  }}>Gamble</button>
              </div>
            </div>
          );
        })}
      </div>

      {allAnswered && !isConsistent && (
        <div style={{
          background: "#FFF0F0", borderRadius: 12, padding: 20, borderLeft: `5px solid ${C.red}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.red, marginBottom: 8 }}>
            Inconsistent Preferences
          </div>
          <p style={{ fontSize: 14, color: C.darkSoft, margin: 0, lineHeight: 1.6 }}>
            Your preference order is not monotonic (e.g. Safe → Gamble → Safe).
            Under Expected Utility Theory, as σ decreases, a rational investor should
            weakly prefer the gamble more — never less. Please revise your choices so they
            follow a consistent order: Safe → Indifferent → Gamble from top to bottom.
          </p>
        </div>
      )}

      {allAnswered && isConsistent && !hasIndifferent && (
        <div style={{
          background: C.yellowSoft, borderRadius: 12, padding: 20, borderLeft: `5px solid ${C.yellow}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#B8860B", marginBottom: 6 }}>
            Almost there — mark your indifference point
          </div>
          <p style={{ fontSize: 13, color: C.darkSoft, margin: 0, lineHeight: 1.6 }}>
            To pin down your exact A, please mark at least one gamble as <b>"Indiff."</b> —
            the gamble where you are just indifferent between the risky and the safe option.
          </p>
        </div>
      )}

      {allAnswered && isConsistent && hasIndifferent && (
        <div>
          {!showResult ? (
            <button onClick={() => setShowResult(true)} style={{
              display: "block", margin: "0 auto", padding: "12px 32px",
              background: C.yellow, border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 700, color: C.dark, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}>Reveal My Risk Aversion</button>
          ) : (
            <ResultPanel A={estimatedA} />
          )}
        </div>
      )}

      {!allAnswered && (
        <p style={{ textAlign: "center", fontSize: 13, color: C.gray, marginTop: 8 }}>
          Answer all {GAMBLES.length} gambles to see your result ({Object.keys(answers).length}/{GAMBLES.length} done)
        </p>
      )}
    </div>
  );
}

function ResultPanel({ A }) {
  let label, color, desc;
  if (A <= 1) { label = "Risk-Seeking / Risk-Neutral"; color = C.green; desc = "You accept most gambles, even highly volatile ones. You enjoy risk or are nearly indifferent to it."; }
  else if (A <= 3) { label = "Low Risk Aversion"; color = "#2E7D32"; desc = "You are willing to accept significant volatility if the expected return is attractive."; }
  else if (A <= 5) { label = "Moderate Risk Aversion"; color = C.blue; desc = "You balance risk and return carefully. This is a typical range found in academic studies (A ≈ 2–4)."; }
  else if (A <= 8) { label = "High Risk Aversion"; color = "#D44C2D"; desc = "You strongly prefer certainty and require substantial compensation for bearing risk."; }
  else if (A <= 15) { label = "Very High Risk Aversion"; color = C.red; desc = "You are very reluctant to take on risk. Only gambles with very low volatility appeal to you."; }
  else { label = "Extremely Risk-Averse"; color = C.red; desc = "You demand near-certainty. Even small amounts of volatility are enough to deter you from investing."; }

  const gaugeMax = 30;
  const gaugeWidth = 400, gaugeH = 60;
  const aPos = Math.min(Math.max(A, 0), gaugeMax) / gaugeMax;

  return (
    <div style={{ background: C.grayLight, borderRadius: 12, padding: 24, borderLeft: `5px solid ${C.yellow}` }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Your estimated risk aversion parameter</div>
        <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>A ≈ {A !== null ? A.toFixed(1) : "?"}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <svg viewBox={`0 0 ${gaugeWidth} ${gaugeH}`} style={{ width: gaugeWidth, maxWidth: "100%" }}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.green} /><stop offset="25%" stopColor={C.blue} />
              <stop offset="55%" stopColor="#D44C2D" /><stop offset="100%" stopColor={C.red} />
            </linearGradient>
          </defs>
          <rect x={0} y={20} width={gaugeWidth} height={14} rx={7} fill="url(#gaugeGrad)" opacity={0.25} />
          <rect x={0} y={20} width={aPos * gaugeWidth} height={14} rx={7} fill="url(#gaugeGrad)" />
          <circle cx={aPos * gaugeWidth} cy={27} r={10} fill={C.white} stroke={color} strokeWidth={3} />
          <text x={0} y={52} fontSize={10} fill={C.gray}>A = 0</text>
          <text x={gaugeWidth * 0.13} y={12} fontSize={9} fill={C.gray} textAnchor="middle">Low</text>
          <text x={gaugeWidth * 0.33} y={12} fontSize={9} fill={C.gray} textAnchor="middle">Moderate</text>
          <text x={gaugeWidth * 0.55} y={12} fontSize={9} fill={C.gray} textAnchor="middle">High</text>
          <text x={gaugeWidth * 0.80} y={12} fontSize={9} fill={C.gray} textAnchor="middle">Very High</text>
          <text x={gaugeWidth} y={52} fontSize={10} fill={C.gray} textAnchor="end">A = {gaugeMax}</text>
        </svg>
      </div>
      <p style={{ fontSize: 13, color: C.darkSoft, textAlign: "center", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      <div style={{
        marginTop: 12, padding: "8px 12px", background: C.white, borderRadius: 6,
        fontSize: 12, color: C.gray, lineHeight: 1.6, textAlign: "center",
      }}>
        At indifference: U<sub>gamble</sub> = U<sub>safe</sub> → E(r) − ½Aσ² = r<sub>f</sub> → <b>A = 2 · (E(r) − r<sub>f</sub>) / σ²</b><br />
        <span style={{ fontStyle: "italic" }}>Inspired by the multiple price list approach of Holt & Laury (2002), adapted to mean-variance utility.</span>
      </div>
    </div>
  );
}

// ─── Shared Components ───
function SliderControl({ label, value, min, max, step, onChange, fmt, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.darkSoft, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: color || C.dark }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color || C.yellow, height: 6, cursor: "pointer" }} />
    </div>
  );
}

function ExportBtn({ onClick }) {
  return (
    <button onClick={onClick}
      onMouseEnter={(e) => (e.target.style.background = C.dark)}
      onMouseLeave={(e) => (e.target.style.background = C.darkSoft)}
      style={{
        padding: "6px 14px", background: C.darkSoft, color: C.white,
        border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        whiteSpace: "nowrap", flexShrink: 0,
      }}>⬇ Export PNG</button>
  );
}

// ─── MAIN APP ───
export default function RiskAversionTool() {
  const [activeTab, setActiveTab] = useState("utility");

  return (
    <div style={{ fontFamily: "'Aptos', 'Segoe UI', sans-serif", maxWidth: 780, margin: "0 auto", padding: "0 16px", color: C.dark }}>
      <div style={{ borderBottom: `3px solid ${C.yellow}`, paddingBottom: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.gray, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
          FHNW · MSc Finance · Investments
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 2px 0", color: C.dark }}>
          Risk Aversion & Utility Functions
        </h1>
        <div style={{ fontSize: 13, color: C.darkSoft }}>Lecture 03 · Capital Allocation to Risky Assets</div>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.grayLight}`, marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px", border: "none",
              borderBottom: activeTab === tab.id ? `3px solid ${C.yellow}` : "3px solid transparent",
              background: activeTab === tab.id ? C.yellowSoft : "transparent",
              color: activeTab === tab.id ? C.dark : C.gray,
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s", fontFamily: "inherit",
            }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "utility" && <UtilityView />}
      {activeTab === "indifference" && <IndifferenceCurvesView />}
      {activeTab === "experiment" && <ExperimentView />}

      <div style={{
        marginTop: 24, paddingTop: 10, borderTop: `1px solid ${C.grayLight}`,
        fontSize: 11, color: C.gray, display: "flex", justifyContent: "space-between",
      }}>
        <span>Based on BKM, Investments (Current Global Edition)</span>
        <span>Prof. Dr. Tim Kröncke · FHNW School of Business</span>
      </div>
    </div>
  );
}