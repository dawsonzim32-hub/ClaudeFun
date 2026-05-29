"""
data.py - Price data for the trading bot.

This module gives us price "bars" (one row per day: open/high/low/close).

IMPORTANT: By default this generates *fake, synthetic* prices using a random
walk. That is intentional. It lets you run and learn the bot with ZERO real
money and ZERO internet needed. Synthetic data is NOT a prediction of any real
stock and must never be used to judge whether a strategy makes real money.

When you later run this on your own computer (with internet), you can replace
`generate_synthetic_bars` with real data loaded from a CSV you downloaded, or
fetch it from a broker/data API. See README.md for how.
"""

import csv
import random
from dataclasses import dataclass


@dataclass
class Bar:
    """One day of price data for one symbol."""
    date: str      # "YYYY-MM-DD"
    open: float
    high: float
    low: float
    close: float
    volume: int


def generate_synthetic_bars(symbol="FAKE", days=500, start_price=100.0, seed=42):
    """
    Create fake daily price data using a simple random walk.

    - start_price: the price on day 1
    - days: how many trading days to generate
    - seed: fixing the seed makes the output repeatable (good for learning)

    Returns a list of Bar objects, oldest first.
    """
    if days < 2:
        raise ValueError("Need at least 2 days of data to backtest.")
    if start_price <= 0:
        raise ValueError("start_price must be positive.")

    rng = random.Random(seed)
    bars = []
    price = float(start_price)

    # Day counter starting from an arbitrary date. We only use dates as labels.
    year, month, day = 2020, 1, 1

    for i in range(days):
        # Daily return: small upward drift + random noise (a classic toy model).
        # drift ~ +0.02% per day, volatility ~ 1% per day. These are made up.
        daily_return = rng.gauss(0.0002, 0.01)
        new_close = price * (1.0 + daily_return)
        if new_close <= 0:
            new_close = price * 0.5  # guard against impossible negative prices

        open_ = price
        close = new_close
        # high/low wrap around the open/close with a little extra wiggle.
        wiggle = abs(rng.gauss(0, 0.005)) * price
        high = max(open_, close) + wiggle
        low = min(open_, close) - wiggle
        if low <= 0:
            low = min(open_, close) * 0.99
        volume = int(rng.uniform(500_000, 2_000_000))

        # Build a simple date label (we don't need real calendar accuracy here).
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        day += 1
        if day > 28:  # keep months simple to avoid invalid dates
            day = 1
            month += 1
            if month > 12:
                month = 1
                year += 1

        bars.append(Bar(date_str, round(open_, 2), round(high, 2),
                        round(low, 2), round(close, 2), volume))
        price = close

    return bars


def load_bars_from_csv(path):
    """
    Load real (or saved) price data from a CSV file.

    Expected columns (header row required): date,open,high,low,close,volume
    This is the same format you get from most data providers.
    """
    bars = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"{path} is empty or has no header row.")
        missing = {"date", "open", "high", "low", "close"} - set(reader.fieldnames)
        if missing:
            raise ValueError(f"CSV is missing required columns: {sorted(missing)}")
        for row in reader:
            bars.append(Bar(
                date=row["date"],
                open=float(row["open"]),
                high=float(row["high"]),
                low=float(row["low"]),
                close=float(row["close"]),
                volume=int(float(row.get("volume", 0) or 0)),
            ))
    if len(bars) < 2:
        raise ValueError("Need at least 2 rows of price data to backtest.")
    return bars


def save_bars_to_csv(bars, path):
    """Save bars to a CSV file (handy for inspecting the fake data in a spreadsheet)."""
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["date", "open", "high", "low", "close", "volume"])
        for b in bars:
            writer.writerow([b.date, b.open, b.high, b.low, b.close, b.volume])
