#!/usr/bin/env python3
"""
run.py - Start here. This is the main entry point for the trading bot.

What it does, step by step:
  1. Gets price data (fake/synthetic by default -- safe, offline, no money).
  2. Runs a chosen strategy through the backtester with realistic costs and
     strict risk controls.
  3. Prints an honest performance report comparing the strategy to Buy & Hold.

Run it with:
    python3 run.py
    python3 run.py --strategy sma --days 750
    python3 run.py --csv my_real_prices.csv      (when you have real data)

NOTHING here trades real money. It is a learning + testing tool only.
"""

import argparse
import sys

from data import generate_synthetic_bars, load_bars_from_csv, save_bars_to_csv
from strategy import SmaCrossStrategy, BuyAndHoldStrategy
from backtest import run_backtest, Costs, RiskLimits
from report import format_report, ascii_equity_chart


def build_strategy(name, fast, slow):
    name = name.lower()
    if name == "sma":
        return SmaCrossStrategy(fast_window=fast, slow_window=slow)
    if name in ("hold", "buyhold", "buy-and-hold"):
        return BuyAndHoldStrategy()
    raise ValueError(f"Unknown strategy '{name}'. Try 'sma' or 'hold'.")


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="A safe, paper-only trading bot for learning.")
    parser.add_argument("--strategy", default="sma",
                        help="'sma' (moving-average crossover) or 'hold' (buy & hold). Default: sma")
    parser.add_argument("--csv", default=None,
                        help="Path to a real price CSV (date,open,high,low,close,volume). "
                             "If omitted, fake synthetic data is generated.")
    parser.add_argument("--days", type=int, default=750,
                        help="How many days of fake data to generate (ignored if --csv used).")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for fake data (change it to see a different fake market).")
    parser.add_argument("--cash", type=float, default=10_000.0,
                        help="Starting pretend cash. Default: 10000")
    parser.add_argument("--fast", type=int, default=20, help="Fast SMA window. Default: 20")
    parser.add_argument("--slow", type=int, default=50, help="Slow SMA window. Default: 50")
    parser.add_argument("--commission", type=float, default=0.0,
                        help="Flat fee per trade. Default: 0")
    parser.add_argument("--slippage-bps", type=float, default=5.0,
                        help="Slippage in basis points (1 bp = 0.01%%). Default: 5")
    parser.add_argument("--max-weight", type=float, default=1.0,
                        help="Max fraction of equity in the stock (0-1). Default: 1.0")
    parser.add_argument("--daily-loss-halt", type=float, default=0.10,
                        help="Halt trading after a 1-day loss this large (0-1). Default: 0.10")
    parser.add_argument("--max-drawdown-halt", type=float, default=0.25,
                        help="Halt trading after total drawdown this large (0-1). Default: 0.25")
    parser.add_argument("--save-data", default=None,
                        help="Optional path to save the generated fake data as CSV.")
    args = parser.parse_args(argv)

    # --- Step 1: get the data ---
    try:
        if args.csv:
            print(f"Loading real price data from: {args.csv}")
            bars = load_bars_from_csv(args.csv)
        else:
            print(f"Generating {args.days} days of SYNTHETIC (fake) price data "
                  f"(seed={args.seed}).")
            print("   -> This is for learning only. It is not a real stock.\n")
            bars = generate_synthetic_bars(days=args.days, seed=args.seed)
            if args.save_data:
                save_bars_to_csv(bars, args.save_data)
                print(f"   Saved the fake data to {args.save_data}\n")
    except (ValueError, OSError) as e:
        print(f"ERROR getting data: {e}", file=sys.stderr)
        return 1

    # --- Step 2: build strategy + run backtest ---
    try:
        strategy = build_strategy(args.strategy, args.fast, args.slow)
        costs = Costs(commission_per_trade=args.commission,
                      slippage_bps=args.slippage_bps)
        risk = RiskLimits(max_weight=args.max_weight,
                          daily_loss_halt=args.daily_loss_halt,
                          max_drawdown_halt=args.max_drawdown_halt)
        result = run_backtest(bars, strategy, starting_cash=args.cash,
                              costs=costs, risk=risk)
    except ValueError as e:
        print(f"ERROR running backtest: {e}", file=sys.stderr)
        return 1

    # --- Step 3: report ---
    print(format_report(result, strategy.name))
    print(ascii_equity_chart(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
