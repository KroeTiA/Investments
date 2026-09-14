import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, CartesianGrid } from "recharts";

// US data: [year, sp500, smallcap, tbill, tbond, baa, inflation]
const US_RAW = [[1928,0.438112,0.6215,0.0308,0.008355,0.032196,-0.011561],[1929,-0.082979,-0.4608,0.0316,0.042038,0.030179,0.002017],[1930,-0.251236,-0.4835,0.0455,0.045409,0.005398,-0.060015],[1931,-0.438375,-0.4362,0.0231,-0.025589,-0.156808,-0.095257],[1932,-0.086424,0.2865,0.0107,0.087903,0.235896,-0.102725],[1933,0.499822,1.466,0.0096,0.018553,0.129669,0.005076],[1934,-0.011886,0.2307,0.002783,0.079634,0.188164,0.020654],[1935,0.467404,0.549,0.001675,0.04472,0.133077,0.029813],[1936,0.319434,0.9641,0.001725,0.050179,0.113838,0.012088],[1937,-0.353367,-0.5394,0.002758,0.013791,-0.044162,0.036188],[1938,0.292827,0.0516,0.00065,0.042132,0.092359,-0.021282],[1939,-0.010976,-0.0486,0.000458,0.044123,0.079831,-0.014825],[1940,-0.106729,-0.3288,0.000358,0.054025,0.086481,0.009632],[1941,-0.127715,-0.0675,0.001292,-0.020222,0.050072,0.096119],[1942,0.191738,0.6301,0.003425,0.022949,0.051799,0.093312],[1943,0.250613,1.4302,0.0038,0.0249,0.080447,0.030474],[1944,0.190307,0.7115,0.0038,0.025776,0.065659,0.021105],[1945,0.358211,0.9441,0.0038,0.038044,0.067999,0.022536],[1946,-0.084291,-0.1373,0.0038,0.031284,0.02508,0.181648],[1947,0.052,-0.0174,0.006008,0.009197,0.002621,0.090203],[1948,0.057046,-0.0001,0.01045,0.01951,0.03437,0.023656],[1949,0.183032,0.276,0.01115,0.046635,0.053773,-0.020724],[1950,0.308055,0.5281,0.012033,0.004296,0.042388,0.058928],[1951,0.236785,0.0387,0.015175,-0.002953,-0.00191,0.059331],[1952,0.18151,0.0102,0.017225,0.02268,0.044412,0.008826],[1953,-0.012082,-0.0597,0.018908,0.041438,0.016201,0.006239],[1954,0.525633,0.6497,0.009375,0.032898,0.061579,-0.005008],[1955,0.325973,0.2672,0.017243,-0.013364,0.020447,0.003722],[1956,0.074395,-0.0089,0.026214,-0.022558,-0.023527,0.029229],[1957,-0.104574,-0.1519,0.032246,0.06797,-0.007189,0.030627],[1958,0.4372,0.688,0.017665,-0.02099,0.064301,0.017614],[1959,0.120565,0.127,0.03386,-0.026466,0.015743,0.015365],[1960,0.003365,-0.0357,0.02873,0.116395,0.066632,0.014061],[1961,0.266377,0.2945,0.023525,0.020609,0.051,0.006775],[1962,-0.088115,-0.0978,0.027724,0.056935,0.064953,0.013253],[1963,0.226119,0.1965,0.03156,0.016842,0.054645,0.016458],[1964,0.164155,0.2325,0.035457,0.037281,0.051617,0.009722],[1965,0.123992,0.4524,0.039491,0.007189,0.0319,0.019188],[1966,-0.09971,-0.0947,0.048557,0.029079,-0.034454,0.034758],[1967,0.23803,1.1587,0.042935,-0.015806,0.008952,0.028437],[1968,0.108149,0.6069,0.053376,0.032746,0.048451,0.046717],[1969,-0.082414,-0.3295,0.066685,-0.05014,-0.020252,0.061087],[1970,0.035611,-0.1878,0.06391,0.167547,0.056496,0.054626],[1971,0.142212,0.1596,0.043343,0.097869,0.140015,0.033364],[1972,0.187554,0.0016,0.040618,0.028184,0.114091,0.034125],[1973,-0.14308,-0.388,0.070354,0.036587,0.04318,0.087107],[1974,-0.259018,-0.269,0.078458,0.019886,-0.043807,0.121342],[1975,0.369951,0.5968,0.057864,0.036053,0.1105,0.069403],[1976,0.23831,0.4862,0.049766,0.159846,0.197528,0.048434],[1977,-0.069797,0.3029,0.05261,0.0129,0.099547,0.066767],[1978,0.065093,0.2889,0.071783,-0.007776,0.031376,0.090272],[1979,0.185195,0.4169,0.100543,0.006707,-0.020091,0.132889],[1980,0.317352,0.4192,0.113919,-0.029897,-0.033157,0.12397],[1981,-0.047024,-0.0429,0.140362,0.081992,0.084624,0.087817],[1982,0.204191,0.2685,0.1109,0.328145,0.290525,0.038346],[1983,0.223372,0.3486,0.0895,0.032002,0.161943,0.037964],[1984,0.061461,-0.145,0.0992,0.137334,0.156192,0.039546],[1985,0.312351,0.2451,0.0772,0.257125,0.238626,0.038088],[1986,0.184946,0.0209,0.0615,0.242842,0.221461,0.011416],[1987,0.058127,-0.14,0.0596,-0.049605,0.011172,0.044198],[1988,0.165372,0.1715,0.0689,0.082236,0.156814,0.044224],[1989,0.314752,0.0696,0.0839,0.176936,0.163121,0.046361],[1990,-0.030645,-0.2777,0.0775,0.062354,0.056478,0.061281],[1991,0.302348,0.4607,0.0554,0.150045,0.164,0.030614],[1992,0.074937,0.2534,0.0351,0.093616,0.136829,0.029357],[1993,0.099671,0.2556,0.0307,0.14211,0.164446,0.027465],[1994,0.013259,-0.0476,0.0437,-0.080367,-0.012314,0.026713],[1995,0.371952,0.3212,0.0566,0.234808,0.200875,0.025341],[1996,0.22681,0.1479,0.0515,0.014286,0.052796,0.033647],[1997,0.331037,0.2206,0.052,0.099391,0.112973,0.017476],[1998,0.28338,-0.1347,0.0491,0.149214,0.081044,0.015519],[1999,0.208854,0.3771,0.0478,-0.082542,0.009706,0.026841],[2000,-0.090318,-0.0913,0.06,0.166553,0.093784,0.033684],[2001,-0.118498,0.3214,0.0348,0.055722,0.085966,0.015507],[2002,-0.21966,-0.0361,0.0164,0.151164,0.120563,0.023755],[2003,0.283558,0.9123,0.0103,0.003753,0.123826,0.019014],[2004,0.107428,0.173,0.014,0.044907,0.103295,0.032604],[2005,0.048345,0.0378,0.0322,0.028675,0.051326,0.033768],[2006,0.156126,0.184,0.0485,0.01961,0.052684,0.025375],[2007,0.054847,-0.0911,0.0448,0.102099,0.049049,0.040832],[2008,-0.365523,-0.4468,0.014,0.201013,-0.034445,0.000919],[2009,0.259352,0.4694,0.0015,-0.111167,0.199585,0.027202],[2010,0.148211,0.2773,0.0014,0.084629,0.094019,0.014921],[2011,0.020984,-0.1404,0.0005,0.160353,0.12256,0.029458],[2012,0.158906,0.1896,0.0009,0.029716,0.093999,0.017451],[2013,0.321451,0.503,0.0006,-0.091046,-0.011253,0.015018],[2014,0.135244,0.0153,0.0003,0.107462,0.107464,0.007561],[2015,0.013789,-0.0912,0.0005,0.012843,-0.015009,0.007342],[2016,0.117731,0.1702,0.0032,0.006906,0.115245,0.021272],[2017,0.216055,0.1513,0.0095,0.028017,0.091513,0.021099],[2018,-0.042269,-0.1621,0.0197,-0.000167,-0.031827,0.019085],[2019,0.312117,0.1192,0.0211,0.096356,0.152478,0.023053],[2020,0.180232,0.3416,0.0036,0.113319,0.106012,0.013629],[2021,0.284689,0.2241,0.0004,-0.04416,0.010161,0.070079],[2022,-0.180375,-0.229,0.0209,-0.178282,-0.152281,0.064427],[2023,0.260607,0.0519,0.0528,0.0388,0.087357,0.031347],[2024,0.248786,0.087,0.0518,-0.016372,0.017364,0.028826],[2025,0.177237,0.1653,0.0421,0.077955,0.069627,0.024000]];

// CH data: [year, shares, bonds, cpi]
const CH_RAW = [[1926,0.217,0.062,-0.035],[1927,0.261,0.054,0.007],[1928,0.211,0.05,0.001],[1929,-0.062,0.05,-0.004],[1930,-0.056,0.062,-0.033],[1931,-0.301,0.063,-0.073],[1932,0.052,0.051,-0.072],[1933,0.095,0.039,-0.023],[1934,-0.072,0.035,-0.019],[1935,-0.113,0.039,0.009],[1936,0.525,0.057,0.015],[1937,0.078,0.043,0.044],[1938,0.018,0.06,-0.007],[1939,-0.165,0.018,0.037],[1940,0.036,0.018,0.126],[1941,0.347,0.065,0.153],[1942,0.064,0.036,0.083],[1943,-0.016,0.035,0.029],[1944,0.056,0.03,0.014],[1945,0.16,0.027,-0.007],[1946,0.076,0.035,0.026],[1947,0.099,0.031,0.053],[1948,-0.052,0.025,0.006],[1949,0.141,0.046,-0.019],[1950,0.097,0.061,0.0],[1951,0.195,0.007,0.064],[1952,0.084,0.022,0.001],[1953,0.105,0.04,-0.006],[1954,0.261,0.033,0.015],[1955,0.06,0.015,0.006],[1956,0.021,0.021,0.022],[1957,-0.103,0.008,0.02],[1958,0.228,0.029,0.009],[1959,0.292,0.07,-0.006],[1960,0.445,0.062,0.018],[1961,0.494,0.038,0.035],[1962,-0.177,0.024,0.032],[1963,-0.002,0.012,0.039],[1964,-0.069,0.021,0.023],[1965,-0.07,0.048,0.049],[1966,-0.121,0.023,0.046],[1967,0.472,0.059,0.035],[1968,0.395,0.063,0.022],[1969,0.045,0.004,0.023],[1970,-0.106,0.038,0.054],[1971,0.155,0.114,0.066],[1972,0.207,0.04,0.068],[1973,-0.2,-0.003,0.119],[1974,-0.331,0.019,0.076],[1975,0.468,0.166,0.034],[1976,0.079,0.164,0.013],[1977,0.081,0.09,0.011],[1978,-0.005,0.083,0.008],[1979,0.109,-0.021,0.052],[1980,0.061,0.023,0.044],[1981,-0.119,0.019,0.066],[1982,0.133,0.12,0.055],[1983,0.273,0.034,0.021],[1984,0.045,0.034,0.029],[1985,0.614,0.058,0.033],[1986,0.097,0.059,0.0],[1987,-0.275,0.051,0.02],[1988,0.236,0.043,0.02],[1989,0.226,-0.04,0.05],[1990,-0.193,0.012,0.053],[1991,0.177,0.082,0.052],[1992,0.176,0.12,0.034],[1993,0.508,0.13,0.025],[1994,-0.076,-0.006,0.004],[1995,0.231,0.123,0.019],[1996,0.183,0.054,0.008],[1997,0.552,0.057,0.004],[1998,0.154,0.057,0.0],[1999,0.117,-0.004,0.017],[2000,0.119,0.034,0.015],[2001,-0.22,0.038,0.003],[2002,-0.26,0.102,0.009],[2003,0.221,0.021,0.006],[2004,0.069,0.042,0.013],[2005,0.356,0.032,0.01],[2006,0.207,-0.001,0.006],[2007,-0.001,-0.005,0.02],[2008,-0.34,0.045,0.007],[2009,0.232,0.064,0.003],[2010,0.029,0.037,0.005],[2011,-0.077,0.048,-0.007],[2012,0.177,0.042,-0.004],[2013,0.246,-0.013,0.001],[2014,0.13,0.068,-0.003],[2015,0.027,0.018,-0.013],[2016,-0.014,0.013,0.0],[2017,0.199,0.001,0.008],[2018,-0.086,0.001,0.007],[2019,0.306,0.03,0.002],[2020,0.038,0.009,-0.008],[2021,0.234,-0.018,0.015],[2022,-0.165,-0.121,0.028],[2023,0.061,0.074,0.017],[2024,0.062,0.053,0.007]];

const US_ASSETS = [
  { key: "tbill", label: "US Cash (3M T-Bill)", color: "#16a34a" },
  { key: "tbond", label: "US Gov Bonds (10Y)", color: "#d97706" },
  { key: "baa", label: "US Corp Bonds (Baa)", color: "#dc2626" },
  { key: "sp500", label: "S&P 500", color: "#2563eb" },
  { key: "smallcap", label: "US Small Caps", color: "#7c3aed" },
];
const US_INFLATION = { key: "inflation", label: "Inflation (CPI)", color: "#71717a" };

const CH_ASSETS = [
  { key: "bonds", label: "CH Bonds (AAA-BBB)", color: "#d97706" },
  { key: "shares", label: "CH Equities (SPI)", color: "#2563eb" },
];
const CH_INFLATION = { key: "inflation", label: "Inflation (CPI)", color: "#71717a" };

const US_DATA = US_RAW.map(r => ({ year: r[0], sp500: r[1], smallcap: r[2], tbill: r[3], tbond: r[4], baa: r[5], inflation: r[6] }));
const CH_DATA = CH_RAW.map(r => ({ year: r[0], shares: r[1], bonds: r[2], inflation: r[3] }));

function computeStats(returns, tbillReturns) {
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const riskPremium = tbillReturns ? returns.reduce((a, b, i) => a + (b - tbillReturns[i]), 0) / n : null;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const m3 = returns.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0) / n;
  const m4 = returns.reduce((a, b) => a + ((b - mean) / sd) ** 4, 0) / n;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx1 = Math.floor(n * 0.01);
  const var1 = sorted[idx1];
  const tail = sorted.filter(r => r <= var1);
  const es1 = tail.length > 0 ? tail.reduce((a, b) => a + b, 0) / tail.length : var1;
  let peak = 1, maxDD = 0, cum = 1;
  for (const r of returns) { cum *= (1 + r); if (cum > peak) peak = cum; const dd = (peak - cum) / peak; if (dd > maxDD) maxDD = dd; }
  return { mean, riskPremium, sd, skewness: m3, kurtosis: m4, var1, es1, maxDD, max: Math.max(...returns), min: Math.min(...returns) };
}

function getCumulative(data, key) {
  let cum = 100;
  return data.map(d => { cum *= (1 + d[key]); return { year: d.year, value: cum }; });
}

function getHistogramBins(returns, globalMin, globalMax, numBins = 30) {
  const binWidth = (globalMax - globalMin) / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    x0: globalMin + i * binWidth, x1: globalMin + (i + 1) * binWidth,
    label: ((globalMin + (i + 0.5) * binWidth) * 100).toFixed(0) + "%",
    count: 0, midpoint: globalMin + (i + 0.5) * binWidth,
  }));
  for (const r of returns) { const idx = Math.min(Math.max(Math.floor((r - globalMin) / binWidth), 0), numBins - 1); bins[idx].count++; }
  return bins;
}

const fmt = (v, d = 2) => (v * 100).toFixed(d) + "%";
const fmtN = (v, d = 2) => v.toFixed(d);

const US_STAT_LABELS = [
  { key: "mean", label: "Arithmetic Mean", format: v => fmt(v) },
  { key: "riskPremium", label: "Risk Premium (vs Cash)", format: v => fmt(v) },
  { key: "sd", label: "Standard Deviation", format: v => fmt(v) },
  { key: "skewness", label: "Skewness", format: v => fmtN(v) },
  { key: "kurtosis", label: "Kurtosis", format: v => fmtN(v) },
  { key: "var1", label: "VaR 1%", format: v => fmt(v) },
  { key: "es1", label: "ES 1%", format: v => fmt(v) },
  { key: "maxDD", label: "Max Drawdown", format: v => fmt(v) },
  { key: "max", label: "Best Year", format: v => fmt(v) },
  { key: "min", label: "Worst Year", format: v => fmt(v) },
];

const CH_STAT_LABELS = [
  { key: "mean", label: "Arithmetic Mean", format: v => fmt(v) },
  { key: "sd", label: "Standard Deviation", format: v => fmt(v) },
  { key: "skewness", label: "Skewness", format: v => fmtN(v) },
  { key: "kurtosis", label: "Kurtosis", format: v => fmtN(v) },
  { key: "var1", label: "VaR 1%", format: v => fmt(v) },
  { key: "es1", label: "ES 1%", format: v => fmt(v) },
  { key: "maxDD", label: "Max Drawdown", format: v => fmt(v) },
  { key: "max", label: "Best Year", format: v => fmt(v) },
  { key: "min", label: "Worst Year", format: v => fmt(v) },
];

const CumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#333", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginTop: 2 }}>{p.name}: ${p.value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      ))}
    </div>
  );
};

const HistTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#333", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <div>{(d.x0 * 100).toFixed(1)}% to {(d.x1 * 100).toFixed(1)}%</div>
      <div style={{ marginTop: 2 }}>Count: {d.count}</div>
    </div>
  );
};

export default function HistoricalReturns() {
  const [market, setMarket] = useState("us");
  const [view, setView] = useState("stats");
  const [startYear, setStartYear] = useState(1928);
  const [endYear, setEndYear] = useState(2025);
  const [logScale, setLogScale] = useState(true);

  const isUS = market === "us";
  const assets = isUS ? US_ASSETS : CH_ASSETS;
  const inflationDef = isUS ? US_INFLATION : CH_INFLATION;
  const allWithInflation = [...assets, inflationDef];
  const statLabels = isUS ? US_STAT_LABELS : CH_STAT_LABELS;
  const rawData = isUS ? US_DATA : CH_DATA;
  const allYears = rawData.map(d => d.year);
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);

  const effectiveStart = Math.max(startYear, minYear);
  const effectiveEnd = Math.min(endYear, maxYear);

  const filtered = useMemo(() => rawData.filter(d => d.year >= effectiveStart && d.year <= effectiveEnd), [rawData, effectiveStart, effectiveEnd]);

  const allStats = useMemo(() => {
    const tb = isUS ? filtered.map(d => d.tbill) : null;
    return Object.fromEntries(allWithInflation.map(a => [a.key, computeStats(filtered.map(d => d[a.key]), tb)]));
  }, [filtered, isUS, allWithInflation]);

  const cumData = useMemo(() => {
    const series = allWithInflation.map(a => getCumulative(filtered, a.key));
    return filtered.map((_, i) => {
      const row = { year: filtered[i].year };
      allWithInflation.forEach((a, j) => { row[a.key] = series[j][i].value; });
      return row;
    });
  }, [filtered, allWithInflation]);

  const { histData, histMaxCount } = useMemo(() => {
    const allReturns = assets.flatMap(a => filtered.map(d => d[a.key]));
    const gMin = Math.min(...allReturns);
    const gMax = Math.max(...allReturns);
    const hd = Object.fromEntries(assets.map(a => [a.key, getHistogramBins(filtered.map(d => d[a.key]), gMin, gMax)]));
    const maxC = Math.max(...Object.values(hd).flatMap(bins => bins.map(b => b.count)));
    return { histData: hd, histMaxCount: maxC };
  }, [filtered, assets]);

  const selStyle = {
    background: "#f8f9fa", border: "1px solid #d1d5db", color: "#333",
    borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
  };

  const title = isUS ? "US Capital Markets: 1928–2025" : "Swiss Capital Markets: 1926–2024";
  const subtitle = isUS ? "Annual nominal returns" : "Annual nominal returns";
  const source = isUS
    ? "Source: Aswath Damodaran, NYU Stern School of Business (pages.stern.nyu.edu/~adamodar)"
    : "Source: Pictet Wealth Management — The long-term performance of Swiss equities and bonds (1926–2024)";

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#ffffff", color: "#1f2937", minHeight: "100vh", padding: "24px 20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; }`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, color: "#9ca3af", textTransform: "uppercase" }}>Investments · Risk and Return: The Historical Record</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px 0", color: "#111827" }}>{title}</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px 0" }}>{subtitle}</p>

        {/* Market toggle + View tabs + Period */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
          {/* Market toggle */}
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            {[{ id: "us", label: "US" }, { id: "ch", label: "Switzerland" }].map(m => (
              <button key={m.id} onClick={() => { setMarket(m.id); if (m.id === "ch" && endYear > 2024) setEndYear(2024); if (m.id === "ch" && startYear < 1926) setStartYear(1926); if (m.id === "us" && startYear < 1928) setStartYear(1928); }} style={{
                padding: "8px 16px", fontSize: 13, fontWeight: market === m.id ? 700 : 400,
                border: "none", cursor: "pointer", fontFamily: "inherit",
                background: market === m.id ? "#111827" : "transparent",
                color: market === m.id ? "#fff" : "#6b7280", transition: "all 0.2s",
              }}>{m.label}</button>
            ))}
          </div>

          {/* View tabs */}
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            {[{ id: "stats", label: "Statistics" }, { id: "cumulative", label: "Cumulative Performance" }, { id: "histograms", label: "Histograms" }].map(t => (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                padding: "8px 16px", fontSize: 13, fontWeight: view === t.id ? 600 : 400,
                border: "none", cursor: "pointer", fontFamily: "inherit",
                background: view === t.id ? "#2563eb" : "transparent",
                color: view === t.id ? "#fff" : "#6b7280", transition: "all 0.2s",
              }}>{t.label}</button>
            ))}
          </div>

          {/* Period */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Period</span>
            <select value={effectiveStart} onChange={e => setStartYear(+e.target.value)} style={selStyle}>
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ color: "#bbb" }}>–</span>
            <select value={effectiveEnd} onChange={e => setEndYear(+e.target.value)} style={selStyle}>
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          {allWithInflation.map(a => (
            <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.color }} />
              <span style={{ color: "#555" }}>{a.label}</span>
            </div>
          ))}
        </div>

        {/* STATS */}
        {view === "stats" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", background: "#f8f9fa", color: "#6b7280", fontWeight: 600, fontSize: 11, letterSpacing: 1, borderBottom: "2px solid #e5e7eb", textTransform: "uppercase", position: "sticky", left: 0, zIndex: 1 }}>Statistic</th>
                  {allWithInflation.map(a => (
                    <th key={a.key} style={{ textAlign: "right", padding: "12px 16px", background: "#f8f9fa", borderBottom: "2px solid #e5e7eb", color: a.color, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statLabels.map((s, i) => (
                  <tr key={s.key}>
                    <td style={{ padding: "10px 16px", fontWeight: 500, color: "#374151", borderBottom: "1px solid #f0f0f0", position: "sticky", left: 0, background: i % 2 === 0 ? "#fff" : "#fafbfc", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>{s.label}</td>
                    {allWithInflation.map(a => {
                      const val = allStats[a.key]?.[s.key];
                      if (val === null || val === undefined) return <td key={a.key} style={{ padding: "10px 16px", textAlign: "right", borderBottom: "1px solid #f0f0f0", color: "#ccc", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>–</td>;
                      const clr = ["min", "var1", "es1", "maxDD"].includes(s.key)
                        ? (val < 0 ? "#dc2626" : "#374151")
                        : ["max", "mean", "riskPremium"].includes(s.key)
                        ? (val > 0 ? "#16a34a" : "#dc2626")
                        : "#374151";
                      return (
                        <td key={a.key} style={{ padding: "10px 16px", textAlign: "right", borderBottom: "1px solid #f0f0f0", color: clr, fontWeight: 500, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                          {s.format(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>
              VaR 1% and ES 1%: historical simulation.{isUS ? " Risk premium: excess return over 3-month T-Bills." : ""} Period: {effectiveStart}–{effectiveEnd} ({filtered.length} years).
            </p>
          </div>
        )}

        {/* CUMULATIVE */}
        {view === "cumulative" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Growth of {isUS ? "$" : "CHF "}100 invested in {effectiveStart}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#6b7280", marginLeft: "auto" }}>
                <input type="checkbox" checked={logScale} onChange={() => setLogScale(!logScale)} style={{ accentColor: "#2563eb" }} />
                Log scale
              </label>
            </div>
            <div style={{ background: "#fafafa", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 8px 8px 0" }}>
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={cumData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#aaa" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis stroke="#aaa" tick={{ fontSize: 11, fill: "#888" }}
                    scale={logScale ? "log" : "auto"} domain={logScale ? ["auto", "auto"] : [0, "auto"]} allowDataOverflow
                    tickFormatter={v => v >= 1000000 ? (v / 1000000).toFixed(0) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v.toFixed(0)}
                  />
                  <Tooltip content={<CumTooltip />} />
                  {allWithInflation.map(a => (
                    <Line key={a.key} type="monotone" dataKey={a.key} name={a.label} stroke={a.color}
                      strokeWidth={a.key === "inflation" ? 1.5 : 2}
                      strokeDasharray={a.key === "inflation" ? "5 3" : undefined}
                      dot={false} activeDot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
              {logScale ? "Logarithmic scale — equal vertical distances represent equal percentage changes." : "Linear scale."} Period: {effectiveStart}–{effectiveEnd}. Inflation shown as dashed line.
            </p>
          </div>
        )}

        {/* HISTOGRAMS */}
        {view === "histograms" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340, 1fr))", gap: 16 }}>
            {assets.map(a => {
              const bins = histData[a.key];
              const stats = allStats[a.key];
              return (
                <div key={a.key} style={{ background: "#fafafa", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: a.color, marginBottom: 4 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                    μ = {fmt(stats.mean)} · σ = {fmt(stats.sd)} · Skew = {fmtN(stats.skewness)} · Kurt = {fmtN(stats.kurtosis)}
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={bins} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#999" }} interval={Math.floor(bins.length / 5)} stroke="#ddd" />
                      <YAxis tick={{ fontSize: 9, fill: "#999" }} stroke="#ddd" domain={[0, histMaxCount]} />
                      <Tooltip content={<HistTooltip />} />
                      <ReferenceLine x={bins.reduce((best, b) => Math.abs(b.midpoint) < Math.abs(best.midpoint) ? b : best, bins[0]).label} stroke="#ccc" strokeDasharray="3 3" />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {bins.map((b, i) => <Cell key={i} fill={b.midpoint < 0 ? a.color + "55" : a.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af" }}>
          {source}
        </div>
      </div>
    </div>
  );
}
