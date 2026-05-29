"""
report.py - Turn backtest results into honest, plain-language performance stats.

The goal is to make it HARD to fool yourself. We always show the strategy next
to a simple Buy & Hold benchmark, and we report risk (drawdown) -- not just
return -- because a strategy that makes 10% but could have lost you 40% along
the way is not actually "good".
"""

import math


def _total_return(curve):
    """Overall percent gain/loss from start to end."""
    if not curve or curve[0] <= 0:
        return 0.0
    return curve[-1] / curve[0] - 1.0


def _max_drawdown(curve):
    """
    Largest peak-to-trough drop along the way, as a fraction (e.g. 0.30 = 30%).
    This is the "how bad did it feel" number. Lower is safer.
    """
    peak = curve[0]
    worst = 0.0
    for v in curve:
        peak = max(peak, v)
        if peak > 0:
            dd = (v - peak) / peak
            worst = min(worst, dd)
    return worst


def _daily_returns(curve):
    rets = []
    for i in range(1, len(curve)):
        if curve[i - 1] > 0:
            rets.append(curve[i] / curve[i - 1] - 1.0)
    return rets


def _sharpe(curve):
    """
    Sharpe ratio: return earned per unit of "bumpiness" (volatility), annualized.
    Roughly: higher is better; above ~1 is decent, but treat with suspicion on
    fake data. Assumes ~252 trading days/year and a 0% risk-free rate for simplicity.
    """
    rets = _daily_returns(curve)
    if len(rets) < 2:
        return 0.0
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
    std = math.sqrt(var)
    if std == 0:
        return 0.0
    return (mean / std) * math.sqrt(252)


def _cagr(curve, num_days):
    """Compound Annual Growth Rate -- the steady yearly rate that gives this result."""
    if not curve or curve[0] <= 0 or num_days <= 0:
        return 0.0
    years = num_days / 252.0
    if years <= 0:
        return 0.0
    ratio = curve[-1] / curve[0]
    if ratio <= 0:
        return -1.0
    return ratio ** (1.0 / years) - 1.0


def format_report(result, strategy_name):
    """Build a readable multi-line text report from a BacktestResult."""
    eq = result.equity_curve
    bh = result.benchmark_curve
    n = len(eq)

    lines = []
    lines.append("=" * 60)
    lines.append(f"  BACKTEST REPORT  -  {strategy_name}")
    lines.append("=" * 60)
    lines.append("")
    lines.append("  *** SIMULATED RESULTS. NO REAL MONEY. ***")
    lines.append("")
    lines.append(f"  Period            : {result.dates[0]} to {result.dates[-1]} ({n} trading days)")
    lines.append(f"  Starting cash     : ${result.starting_cash:,.2f}")
    lines.append(f"  Ending value      : ${eq[-1]:,.2f}")
    lines.append(f"  Number of trades  : {result.trades}")
    lines.append("")

    lines.append("  STRATEGY")
    lines.append(f"    Total return    : {_total_return(eq):+.2%}")
    lines.append(f"    Annualized (CAGR): {_cagr(eq, n):+.2%}")
    lines.append(f"    Max drawdown    : {_max_drawdown(eq):.2%}   (worst peak-to-trough drop)")
    lines.append(f"    Sharpe ratio    : {_sharpe(eq):.2f}   (return per unit of risk)")
    lines.append("")

    lines.append("  BENCHMARK (Buy & Hold)")
    lines.append(f"    Total return    : {_total_return(bh):+.2%}")
    lines.append(f"    Annualized (CAGR): {_cagr(bh, n):+.2%}")
    lines.append(f"    Max drawdown    : {_max_drawdown(bh):.2%}")
    lines.append(f"    Sharpe ratio    : {_sharpe(bh):.2f}")
    lines.append("")

    # The honest verdict.
    strat_ret = _total_return(eq)
    bh_ret = _total_return(bh)
    lines.append("  VERDICT")
    if strat_ret > bh_ret:
        diff = strat_ret - bh_ret
        lines.append(f"    The strategy beat Buy & Hold by {diff:+.2%} on THIS data.")
        lines.append("    (Remember: this is fake/historical data. It does not")
        lines.append("     prove the strategy will make money in the future.)")
    else:
        diff = bh_ret - strat_ret
        lines.append(f"    Buy & Hold beat the strategy by {diff:+.2%} on this data.")
        lines.append("    The added complexity did not pay off here.")
    lines.append("")

    if result.halted:
        lines.append("  !! RISK HALT TRIGGERED !!")
        lines.append(f"    {result.halt_reason}")
        lines.append("    Trading was stopped and the position moved to cash.")
        lines.append("")

    lines.append("=" * 60)
    return "\n".join(lines)


def ascii_equity_chart(result, width=58, height=12):
    """A tiny text chart of the equity curve vs benchmark, so you can SEE it."""
    eq = result.equity_curve
    bh = result.benchmark_curve
    if len(eq) < 2:
        return ""

    # Sample down to `width` columns.
    def sample(curve):
        step = max(1, len(curve) // width)
        return curve[::step][:width]

    s_eq = sample(eq)
    s_bh = sample(bh)
    lo = min(min(s_eq), min(s_bh))
    hi = max(max(s_eq), max(s_bh))
    if hi == lo:
        hi = lo + 1.0

    def row_of(curve_val):
        return int((curve_val - lo) / (hi - lo) * (height - 1))

    grid = [[" "] * len(s_eq) for _ in range(height)]
    for x in range(len(s_eq)):
        grid[height - 1 - row_of(s_bh[x])][x] = "."   # benchmark = dots
    for x in range(len(s_eq)):
        grid[height - 1 - row_of(s_eq[x])][x] = "#"    # strategy = hashes

    out = ["", "  Equity curve:  # = strategy   . = buy & hold", ""]
    for r, line in enumerate(grid):
        # Add a $ scale on the left edge (top and bottom only).
        label = ""
        if r == 0:
            label = f"${hi:,.0f}"
        elif r == height - 1:
            label = f"${lo:,.0f}"
        out.append(f"  {label:>10} |" + "".join(line))
    out.append("")
    return "\n".join(out)
