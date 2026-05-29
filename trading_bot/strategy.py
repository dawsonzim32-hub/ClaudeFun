"""
strategy.py - Trading strategies.

A "strategy" looks at the price history up to today and decides what it WANTS
the position to be: fully invested (1.0), flat/in cash (0.0), or somewhere in
between. It does NOT touch money, fees, or risk limits directly -- the
backtester (backtest.py) handles all of that. This separation keeps strategies
simple and honest.

The example here is a Moving Average Crossover -- one of the most common
beginner strategies. It is NOT guaranteed to be profitable. It's a teaching
example so you can see how the whole machine fits together.
"""

from dataclasses import dataclass


def simple_moving_average(values, window):
    """Average of the last `window` values. Returns None if not enough data yet."""
    if window <= 0:
        raise ValueError("window must be positive.")
    if len(values) < window:
        return None
    return sum(values[-window:]) / window


@dataclass
class SmaCrossStrategy:
    """
    Moving Average Crossover.

    Idea: when the short-term average price rises above the long-term average,
    the trend is "up", so we want to be invested (target 1.0 = 100% in the
    stock). When it falls below, we move to cash (target 0.0).

    fast_window must be smaller than slow_window.
    """
    fast_window: int = 20
    slow_window: int = 50
    name: str = "SMA Crossover"

    def __post_init__(self):
        if self.fast_window >= self.slow_window:
            raise ValueError("fast_window must be smaller than slow_window.")
        if self.fast_window <= 0:
            raise ValueError("fast_window must be positive.")

    def warmup(self):
        """How many bars of history we need before we can make a real decision."""
        return self.slow_window

    def target_weight(self, closes):
        """
        Given the list of closing prices up to and including today,
        return the desired portfolio weight in this stock: 0.0 to 1.0.

        Returns None when there isn't enough history yet (stay in cash).
        """
        fast = simple_moving_average(closes, self.fast_window)
        slow = simple_moving_average(closes, self.slow_window)
        if fast is None or slow is None:
            return None  # not enough data -> remain flat
        return 1.0 if fast > slow else 0.0


@dataclass
class BuyAndHoldStrategy:
    """
    The honest benchmark: just buy on day one and hold forever.

    Always compare any strategy against this. If your clever strategy can't
    beat simply buying and holding, the cleverness isn't worth it.
    """
    name: str = "Buy & Hold"

    def warmup(self):
        return 1

    def target_weight(self, closes):
        return 1.0
