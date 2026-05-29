"""
backtest.py - The backtesting engine (the "paper trading simulator").

This walks through price history one day at a time, asks the strategy what
position it wants, and simulates buying/selling with REALISTIC costs and STRICT
risk controls. No real money is ever involved.

Why this matters (read the CLAUDE.md philosophy: quality and safety first):
  * Fees and slippage are included. Ignoring them is the #1 way beginners fool
    themselves into thinking a losing strategy is a winner.
  * Risk controls can HALT trading. A real account should never be allowed to
    blow up; we model that here.
  * We always report against Buy & Hold so you can see if the strategy adds
    anything at all.

Everything here is deterministic given the same inputs, so results are
repeatable.
"""

import math
from dataclasses import dataclass, field


@dataclass
class RiskLimits:
    """
    Hard safety rails. These protect the (simulated) account.

    max_weight:        Never put more than this fraction of equity in the stock
                       (e.g. 1.0 = up to 100%; 0.5 = never more than half).
    daily_loss_halt:   If the portfolio drops this fraction in a single day,
                       stop trading for the rest of the backtest (circuit breaker).
    max_drawdown_halt: If total equity falls this far below its peak, stop
                       trading entirely. (e.g. 0.25 = halt after a 25% drawdown.)
    """
    max_weight: float = 1.0
    daily_loss_halt: float = 0.10
    max_drawdown_halt: float = 0.25

    def __post_init__(self):
        for n, v in [("max_weight", self.max_weight),
                     ("daily_loss_halt", self.daily_loss_halt),
                     ("max_drawdown_halt", self.max_drawdown_halt)]:
            if not (0 < v <= 1.0):
                raise ValueError(f"{n} must be between 0 (exclusive) and 1.0.")


@dataclass
class Costs:
    """
    Trading costs.

    commission_per_trade: flat fee charged whenever we buy or sell (many US
                          brokers are $0 now, but keep it configurable).
    slippage_bps:         "slippage" is the gap between the price you expect and
                          the price you actually get. Measured in basis points
                          (1 bp = 0.01%). 5 bps = 0.05%. This makes the sim honest.
    """
    commission_per_trade: float = 0.0
    slippage_bps: float = 5.0

    def __post_init__(self):
        if self.commission_per_trade < 0 or self.slippage_bps < 0:
            raise ValueError("Costs cannot be negative.")


@dataclass
class BacktestResult:
    """Everything the backtest produced, for reporting."""
    dates: list = field(default_factory=list)
    equity_curve: list = field(default_factory=list)      # portfolio value each day
    benchmark_curve: list = field(default_factory=list)   # buy & hold value each day
    trades: int = 0
    halted: bool = False
    halt_reason: str = ""
    starting_cash: float = 0.0


def _validate_bars(bars):
    if not bars or len(bars) < 2:
        raise ValueError("Need at least 2 price bars to run a backtest.")
    for b in bars:
        if b.close <= 0 or b.open <= 0:
            raise ValueError(f"Bad price on {b.date}: prices must be positive.")


def run_backtest(bars, strategy, starting_cash=10_000.0,
                 costs=None, risk=None):
    """
    Run the simulation.

    bars:          list of Bar objects (oldest first) from data.py
    strategy:      an object with .warmup() and .target_weight(closes)
    starting_cash: how much pretend money to start with
    costs:         a Costs object (defaults to sane values)
    risk:          a RiskLimits object (defaults to conservative values)

    Returns a BacktestResult.

    Trading model (kept deliberately simple and slightly pessimistic, which is
    the safe direction):
      * The strategy decides a target weight using closes UP TO today.
      * We execute the trade at the NEXT day's open price (you can't trade on a
        price you haven't seen yet -- avoiding this "lookahead" bug is critical).
      * Slippage makes buys a touch more expensive and sells a touch cheaper.
    """
    _validate_bars(bars)
    if starting_cash <= 0:
        raise ValueError("starting_cash must be positive.")
    costs = costs or Costs()
    risk = risk or RiskLimits()

    cash = float(starting_cash)
    shares = 0.0
    closes = []

    result = BacktestResult(starting_cash=starting_cash)

    # Benchmark: buy & hold as many shares as starting_cash allows on day 1 open.
    bh_shares = starting_cash / bars[0].open
    peak_equity = starting_cash
    halted = False

    slip = costs.slippage_bps / 10_000.0  # convert basis points to a fraction

    for i, bar in enumerate(bars):
        closes.append(bar.close)

        # --- Mark-to-market: what is our portfolio worth at today's close? ---
        equity = cash + shares * bar.close
        benchmark_value = bh_shares * bar.close

        result.dates.append(bar.date)
        result.equity_curve.append(round(equity, 2))
        result.benchmark_curve.append(round(benchmark_value, 2))

        # --- Risk checks (only meaningful once we have a previous day) ---
        if not halted and len(result.equity_curve) >= 2:
            prev_equity = result.equity_curve[-2]
            if prev_equity > 0:
                daily_change = (equity - prev_equity) / prev_equity
                if daily_change <= -risk.daily_loss_halt:
                    halted = True
                    result.halt_reason = (
                        f"Daily loss of {daily_change:.1%} on {bar.date} "
                        f"hit the {risk.daily_loss_halt:.0%} circuit breaker.")

        peak_equity = max(peak_equity, equity)
        if not halted and peak_equity > 0:
            drawdown = (equity - peak_equity) / peak_equity
            if drawdown <= -risk.max_drawdown_halt:
                halted = True
                result.halt_reason = (
                    f"Drawdown of {drawdown:.1%} by {bar.date} hit the "
                    f"{risk.max_drawdown_halt:.0%} max-drawdown halt.")

        # If halted, liquidate to cash once and then do nothing further.
        if halted:
            if shares > 0:
                sell_price = bar.close * (1 - slip)
                cash += shares * sell_price - costs.commission_per_trade
                shares = 0.0
                result.trades += 1
            result.halted = True
            continue

        # --- Decide target position for TOMORROW, execute at tomorrow's open ---
        if i + 1 >= len(bars):
            break  # no "tomorrow" to trade on for the last bar

        if len(closes) < strategy.warmup():
            continue  # not enough history yet; stay as we are

        target = strategy.target_weight(closes)
        if target is None:
            continue
        target = max(0.0, min(target, risk.max_weight))  # clamp to risk limit

        exec_price = bars[i + 1].open
        if exec_price <= 0:
            continue

        # Desired dollar exposure and the share count to match it.
        current_equity = cash + shares * bar.close
        target_dollars = target * current_equity
        target_shares = target_dollars / exec_price

        delta = target_shares - shares
        # Skip trivially tiny adjustments to avoid churning on fees.
        if abs(delta * exec_price) < max(1.0, 0.001 * current_equity):
            continue

        if delta > 0:  # BUY
            buy_price = exec_price * (1 + slip)
            cost = delta * buy_price + costs.commission_per_trade
            if cost > cash:  # can only spend cash we have
                delta = max(0.0, (cash - costs.commission_per_trade) / buy_price)
                cost = delta * buy_price + costs.commission_per_trade
            if delta > 0:
                cash -= cost
                shares += delta
                result.trades += 1
        else:  # SELL
            sell_price = exec_price * (1 - slip)
            cash += (-delta) * sell_price - costs.commission_per_trade
            shares += delta  # delta is negative
            result.trades += 1

    return result
