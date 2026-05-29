# Trading Bot (Learning / Paper-Trading Edition)

A small, safe, **paper-only** trading bot for learning how automated stock
strategies work. **It never touches real money.** It runs a strategy over price
data, charges realistic fees and slippage, enforces strict risk limits, and
gives you an honest report comparing the strategy to simply buying and holding.

> ⚠️ **Read this first — honest expectations**
>
> Most retail trading bots lose money. A bot only *executes* a strategy; it does
> not create an edge that isn't there. Good backtest results — especially on the
> **fake data** this tool ships with — do **not** mean a strategy will make money
> live. This project exists so you can learn the mechanics safely and measure
> ideas honestly. Treat any profits as hypothetical until proven over a long
> period of *real* paper trading.

## Requirements

- Python 3.10+ (you have 3.11). **No libraries to install** — it uses only
  Python's standard library.

## Quick start

```bash
cd trading_bot

# Run the example moving-average strategy on fake data:
python3 run.py

# Compare against just buying and holding:
python3 run.py --strategy hold

# Try a different fake market (change the seed):
python3 run.py --seed 7 --days 1000
```

## What the files do

| File          | Purpose |
|---------------|---------|
| `run.py`      | **Start here.** The command-line entry point that ties everything together. |
| `data.py`     | Gets price data. Generates *fake* synthetic prices, or loads a real CSV. |
| `strategy.py` | The trading strategies (moving-average crossover + buy & hold benchmark). |
| `backtest.py` | The simulator: executes trades with fees, slippage, and risk limits. |
| `report.py`   | Turns results into a plain-language report + a text chart. |

## Key safety features (by design)

- **No real money, ever.** Everything is simulated.
- **No "lookahead" cheating.** Trades execute at the *next* day's open, never on
  a price the strategy hasn't seen yet (a common bug that fakes great results).
- **Realistic costs.** Commission + slippage are applied to every trade.
- **Risk circuit breakers.** Trading halts and moves to cash if a daily loss or
  total drawdown limit is hit (configurable via `--daily-loss-halt` and
  `--max-drawdown-halt`).
- **Always benchmarked.** Every report compares the strategy to Buy & Hold, so
  you can see whether the complexity actually helped.

## Useful options

```
--strategy sma|hold      Which strategy (default: sma)
--days N                 How many days of fake data (default: 750)
--seed N                 Different seed = different fake market
--cash N                 Starting pretend money (default: 10000)
--fast N --slow N        Moving-average windows for the sma strategy
--commission N           Flat fee per trade
--slippage-bps N         Slippage in basis points (default: 5 = 0.05%)
--max-weight N           Max fraction of money in the stock, 0-1 (default: 1.0)
--daily-loss-halt N      Halt after a 1-day loss this big (default: 0.10)
--max-drawdown-halt N    Halt after total drawdown this big (default: 0.25)
--csv PATH               Use a real price CSV instead of fake data
--save-data PATH         Save the generated fake data to a CSV
```

## Using REAL price data (on your own computer)

This sandbox blocks market-data downloads, but on your own machine you can feed
in real history. The CSV must have this header and one row per day:

```
date,open,high,low,close,volume
2023-01-03,130.28,130.90,124.17,125.07,112117500
...
```

Where to get such a CSV:
- Download from your broker, or a free source, into the format above.
- Or install a data library locally (`pip install yfinance`) and export to CSV.
  (Not included here to keep this tool dependency-free and offline-safe.)

Then:

```bash
python3 run.py --csv path/to/your_data.csv --strategy sma
```

## Sensible next steps (when you're ready)

1. **Run lots of seeds.** `--seed 1`, `2`, `3`… If a strategy only wins on one
   fake market, it has no real edge.
2. **Test on real historical data** via `--csv` for several different stocks and
   time periods.
3. **Paper trade live** through a broker's *sandbox* (e.g. Alpaca paper trading)
   for months before ever considering real money.
4. Only after all of that — and with money you can afford to lose — consider a
   tiny real allocation. Keep the risk halts on.

## What this is NOT

- Not financial advice.
- Not a guarantee (or even a likelihood) of profit.
- Not connected to any brokerage or real account.
