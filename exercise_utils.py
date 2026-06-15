"""
exercise_utils.py
=================
Shared helpers for the MSc Finance · Investments exercises (FHNW).

Usage in a Colab notebook:

    !wget -q https://raw.githubusercontent.com/KroeTiA/Investments/main/exercise_utils.py
    from exercise_utils import FHNW, setup_style, load_returns, describe, save_results

    setup_style()
    idx  = load_returns(DATA_URL, sheet="Total Return Index_Damadoran")
    rets = load_returns(DATA_URL, sheet="Total Return Index_Damadoran", to_returns=True)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

__all__ = ["FHNW", "ASSET_CYCLE", "setup_style", "load_returns", "describe", "save_results"]

# --------------------------------------------------------------------------- #
# FHNW colour palette (consistent with the lecture dashboards)
# --------------------------------------------------------------------------- #
FHNW = {
    "navy":   "#1B3A5C",
    "blue":   "#0057A4",
    "green":  "#2E7D32",
    "red":    "#C8102E",
    "orange": "#EA8700",
    "yellow": "#FFD500",
}

# Default colour cycle for multi-series plots (skips yellow — poor contrast on white)
ASSET_CYCLE = [FHNW["blue"], FHNW["green"], FHNW["orange"],
               FHNW["red"], FHNW["navy"], "#7A7A7A", "#9C27B0"]


# --------------------------------------------------------------------------- #
# Plot styling
# --------------------------------------------------------------------------- #
def setup_style() -> None:
    """Apply consistent FHNW matplotlib defaults. Call once per notebook."""
    from cycler import cycler
    plt.rcParams.update({
        "figure.dpi": 110,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.prop_cycle": cycler(color=ASSET_CYCLE),
        "axes.titlesize": 12,
        "font.size": 11,
        "legend.frameon": False,
    })


# --------------------------------------------------------------------------- #
# Data loading
# --------------------------------------------------------------------------- #
def load_returns(url: str, sheet: str = 0, index_col: str = "Year",
                 to_returns: bool = False) -> pd.DataFrame:
    """
    Read a total-return *index* Excel file and return either the index levels
    or periodic returns.

    Parameters
    ----------
    url        : raw URL (or local path) to the Excel file.
    sheet      : sheet name or position.
    index_col  : column to use as the index (default 'Year').
    to_returns : if True, return periodic returns (pct_change, NaN dropped);
                 if False (default), return the index levels.

    Notes
    -----
    - Drops any trailing column whose header mentions 'Source'.
    - Trims stray whitespace from column headers.
    """
    raw = pd.read_excel(url, sheet_name=sheet)
    raw = raw.loc[:, ~raw.columns.astype(str).str.contains("Source", case=False, na=False)]
    raw.columns = [str(c).strip() for c in raw.columns]
    idx = raw.set_index(index_col)
    idx = idx.apply(pd.to_numeric, errors="coerce").dropna(how="all")
    if to_returns:
        return idx.pct_change().dropna()
    return idx


# --------------------------------------------------------------------------- #
# Descriptive statistics
# --------------------------------------------------------------------------- #
def describe(rets: pd.DataFrame, rf_col: str | None = None,
             periods: int = 1) -> pd.DataFrame:
    """
    Summary statistics per column of a returns DataFrame.

    Parameters
    ----------
    rets    : periodic returns (rows = periods, cols = assets).
    rf_col  : column to use as the risk-free asset for the Sharpe ratio.
              If None, Sharpe is computed against a zero risk-free rate.
    periods : periods per year for annualisation (1 = annual data already,
              12 = monthly, 252 = daily). Means/vol are scaled accordingly.

    Returns
    -------
    DataFrame indexed by asset with columns:
    Arith. mean, Geo. mean, Volatility, Skewness, Excess kurtosis, Sharpe ratio.
    All return/vol figures are annualised.
    """
    from scipy import stats

    def geo_annual(x: pd.Series) -> float:
        return (1 + x).prod() ** (periods / len(x)) - 1

    rf_geo = geo_annual(rets[rf_col]) if rf_col is not None else 0.0

    out = {}
    for col in rets.columns:
        x = rets[col].dropna()
        arith = x.mean() * periods
        geo = geo_annual(x)
        vol = x.std(ddof=1) * np.sqrt(periods)
        out[col] = {
            "Arith. mean": arith,
            "Geo. mean": geo,
            "Volatility": vol,
            "Skewness": stats.skew(x),
            "Excess kurtosis": stats.kurtosis(x),
            "Sharpe ratio": (geo - rf_geo) / vol if vol > 0 else np.nan,
        }
    return pd.DataFrame(out).T


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #
def save_results(figures: dict | None = None,
                 tables: dict | None = None,
                 name: str = "results") -> str:
    """
    Bundle figures (PNG) and tables (Excel sheets) into a single ZIP and,
    when running in Colab, trigger a browser download.

    Parameters
    ----------
    figures : {filename_stem: matplotlib Figure}. Saved as <stem>.png.
    tables  : {sheet_name: DataFrame}. Written into one <name>.xlsx workbook.
    name    : base name for the .xlsx and the .zip.

    Returns
    -------
    The ZIP filename.
    """
    import zipfile

    figures = figures or {}
    tables = tables or {}
    written: list[str] = []

    for stem, fig in figures.items():
        fname = f"{stem}.png"
        fig.savefig(fname)            # dpi/bbox come from rcParams (setup_style)
        written.append(fname)

    if tables:
        xlsx = f"{name}.xlsx"
        with pd.ExcelWriter(xlsx) as w:
            for sheet, df in tables.items():
                df.to_excel(w, sheet_name=str(sheet)[:31])  # Excel 31-char limit
        written.append(xlsx)

    zip_name = f"{name}.zip"
    with zipfile.ZipFile(zip_name, "w") as z:
        for f in written:
            z.write(f)

    try:
        from google.colab import files
        files.download(zip_name)
    except ImportError:
        print(f"Not running in Colab — saved {zip_name} to the working directory.")

    return zip_name
