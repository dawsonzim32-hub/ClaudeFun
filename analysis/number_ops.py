"""
Test if number words + their directions can produce route numbers 664 and 37.
"""

# Number words with their directions
numbers = [
    ("NINETEEN", 19, "→", 1, 10),   # Row 1, Col 10
    ("NINE",      9, "→", 1, 10),   # Row 1, Col 10
    ("NINE",      9, "←", 1, 12),   # Row 1, Col 12 (reverse)
    ("THREE",     3, "↓", 2, 7),    # Row 2, Col 7
    ("ELEVEN",   11, "↓", 8, 1),    # Row 8, Col 1
    ("TWELVE",   12, "←", 9, 18),   # Row 9, Col 18
    ("FIVE",      5, "→", 10, 5),   # Row 10, Col 5
    ("ZERO",      0, "←", 15, 7),   # Row 15, Col 7
    ("THREE",     3, "←", 12, 20),  # Row 12, Col 20 (2nd instance)
]

# Unique number values (no dupes)
unique = [
    ("NINETEEN", 19, "→", 1, 10),
    ("THREE",     3, "↓", 2, 7),
    ("ELEVEN",   11, "↓", 8, 1),
    ("TWELVE",   12, "←", 9, 18),
    ("FIVE",      5, "→", 10, 5),
    ("ZERO",      0, "←", 15, 7),
]

targets = [664, 37, 374, 56, 93, 33]

print("=" * 60)
print("GROUP BY DIRECTION")
print("=" * 60)

right = [(n,v) for n,v,d,r,c in numbers if d == "→"]
left  = [(n,v) for n,v,d,r,c in numbers if d == "←"]
down  = [(n,v) for n,v,d,r,c in numbers if d == "↓"]

print(f"→ (right): {right}")
print(f"← (left):  {left}")
print(f"↓ (down):  {down}")
print()

# Basic sums by direction
r_sum = sum(v for _,v in right)
l_sum = sum(v for _,v in left)
d_sum = sum(v for _,v in down)
r_prod = 1
for _,v in right:
    r_prod *= max(v, 1)  # skip zero
l_prod = 1
for _,v in left:
    if v > 0: l_prod *= v
d_prod = 1
for _,v in down:
    d_prod *= v

print(f"→ sum: {r_sum}  product: {r_prod}")
print(f"← sum: {l_sum}  product: {l_prod}")
print(f"↓ sum: {d_sum}  product: {d_prod}")
print()

print("=" * 60)
print("SIMPLE OPERATIONS → TARGET NUMBERS")
print("=" * 60)

vals_unique = [19, 3, 11, 12, 5, 0]
vals_all = [19, 9, 9, 3, 11, 12, 5, 0, 3]

print(f"Sum all unique: {sum(vals_unique)}")
print(f"Sum all with dupes: {sum(vals_all)}")
print(f"→ sum = {r_sum}  (US 33!)")
print(f"↓ product = {d_prod}  (also 33!)")
print()

# Test: can any combo of additions give us 37?
print("=" * 60)
print("COMBINATIONS THAT SUM TO 37")
print("=" * 60)
from itertools import combinations
all_vals_with_labels = [(n,v) for n,v,d,r,c in numbers]

for size in range(2, len(all_vals_with_labels)+1):
    for combo in combinations(all_vals_with_labels, size):
        if sum(v for _,v in combo) == 37:
            names = [f"{n}({v})" for n,v in combo]
            print(f"  {' + '.join(names)} = 37")

# Test: can any combo of multiplications/additions give us 664?
print()
print("=" * 60)
print("OPERATIONS THAT GIVE ~664")
print("=" * 60)

vals = [0, 3, 5, 9, 11, 12, 19]
nonzero = [3, 5, 9, 11, 12, 19]

# Try multiply pairs then add/subtract others
for i in range(len(nonzero)):
    for j in range(i+1, len(nonzero)):
        prod = nonzero[i] * nonzero[j]
        remainder = 664 - prod
        remaining = [v for k,v in enumerate(nonzero) if k != i and k != j]
        if remainder == sum(remaining):
            print(f"  {nonzero[i]} × {nonzero[j]} = {prod}, + {remaining} = {prod + sum(remaining)}")
        # Also try product of 3
        for k in range(j+1, len(nonzero)):
            prod3 = nonzero[i] * nonzero[j] * nonzero[k]
            remaining3 = [v for m,v in enumerate(nonzero) if m not in (i,j,k)]
            diff = 664 - prod3
            if abs(diff) <= sum(remaining3) + 1:
                print(f"  {nonzero[i]} × {nonzero[j]} × {nonzero[k]} = {prod3}, need {diff}, have {remaining3} (sum={sum(remaining3)})")

# Try: THREE squared
print()
print("=" * 60)
print("SQUARING OPERATIONS")
print("=" * 60)

for n,v,d,r,c in numbers:
    print(f"  {n}({v})² = {v**2}")

# Test: square the ↓ numbers (they point "down" = power?)
print()
print("  If ↓ means SQUARE:")
print(f"    THREE↓ = 3² = 9")
print(f"    ELEVEN↓ = 11² = 121")
print(f"    All squared ↓ sum: 9 + 121 = 130")
print(f"    Squared ↓ + → sum: 130 + {r_sum} = {130 + r_sum}")
print(f"    Squared ↓ + → sum + ← sum: 130 + {r_sum} + {l_sum} = {130 + r_sum + l_sum}")

# What if ← means reverse digits?
print()
print("=" * 60)
print("IF ← MEANS REVERSE THE DIGITS")
print("=" * 60)
for n,v,d,r,c in numbers:
    if d == "←":
        rev = int(str(v)[::-1]) if v > 0 else 0
        print(f"  {n}({v}) reversed = {rev}")

# Reversed ← values
rev_twelve = 21
rev_zero = 0
rev_three = 3
print(f"  ← reversed values: {rev_twelve}, {rev_zero}, {rev_three}")
print(f"  ← reversed sum: {rev_twelve + rev_zero + rev_three}")

# Now combine: → as-is + ← reversed + ↓ squared
r_vals = [19, 9, 5]
l_rev_vals = [21, 0, 3]  # 12→21, 0→0, 3→3
d_sq_vals = [9, 121]  # 3²=9, 11²=121

total_combo = sum(r_vals) + sum(l_rev_vals) + sum(d_sq_vals)
print(f"\n  → values: {r_vals} = {sum(r_vals)}")
print(f"  ← reversed: {l_rev_vals} = {sum(l_rev_vals)}")
print(f"  ↓ squared: {d_sq_vals} = {sum(d_sq_vals)}")
print(f"  TOTAL: {total_combo}")

# What about concatenation by direction?
print()
print("=" * 60)
print("CONCATENATION BY DIRECTION")
print("=" * 60)

# → numbers in grid order: 19, 9, 5
print(f"  → concat: '19' + '9' + '5' = 1995 or 195")
print(f"  ← concat: '12' + '0' + '3' = 1203 or 123")
print(f"  ↓ concat: '3' + '11' = 311")
print(f"  ← reversed concat: '21' + '0' + '3' = 2103 or 213")

# What about using row numbers of number words?
print()
print("=" * 60)
print("ROW NUMBERS OF NUMBER WORDS")
print("=" * 60)
for n,v,d,r,c in numbers:
    print(f"  {n:12s} (val={v:2d}) at Row {r:2d}, Col {c:2d}, Dir {d}")

rows = [r for _,_,_,r,_ in unique]
cols = [c for _,_,_,_,c in unique]
print(f"\n  Row sequence (unique): {rows}")
print(f"  Col sequence (unique): {cols}")
print(f"  Rows concatenated: {''.join(str(r) for r in rows)}")
print(f"  Cols concatenated: {''.join(str(c) for c in cols)}")
print(f"  Row sum: {sum(rows)}")
print(f"  Col sum: {sum(cols)}")

# Big test: try ALL basic operations between direction groups to hit 664 or 37
print()
print("=" * 60)
print("DIRECTION GROUP OPERATIONS → TARGET NUMBERS")
print("=" * 60)

import itertools

r_s, l_s, d_s = r_sum, l_sum, d_sum
r_p, l_p, d_p = r_prod, l_prod, d_prod

groups = {
    "→sum": r_s, "→prod": r_p,
    "←sum": l_s, "←prod": l_p,
    "↓sum": d_s, "↓prod": d_p,
}

print("Direction group values:")
for k,v in groups.items():
    print(f"  {k} = {v}")

print("\nTwo-group operations hitting targets:")
ops = [
    ("+", lambda a,b: a+b),
    ("-", lambda a,b: a-b),
    ("×", lambda a,b: a*b),
    ("concat", lambda a,b: int(str(a)+str(b)) if a >= 0 and b >= 0 else None),
]

for t in targets:
    for k1,v1 in groups.items():
        for k2,v2 in groups.items():
            if k1 == k2:
                continue
            for op_name, op_fn in ops:
                try:
                    result = op_fn(v1, v2)
                    if result == t:
                        print(f"  {k1}({v1}) {op_name} {k2}({v2}) = {t} ← TARGET!")
                except:
                    pass

# Three-group operations
print("\nThree-group operations:")
group_list = list(groups.items())
for i in range(len(group_list)):
    for j in range(len(group_list)):
        for k in range(len(group_list)):
            if i == j or j == k or i == k:
                continue
            k1,v1 = group_list[i]
            k2,v2 = group_list[j]
            k3,v3 = group_list[k]
            # Try: (v1 op v2) op v3
            for op1_name, op1 in ops[:3]:
                for op2_name, op2 in ops[:3]:
                    try:
                        mid = op1(v1,v2)
                        result = op2(mid, v3)
                        if result in targets:
                            print(f"  ({k1} {op1_name} {k2}) {op2_name} {k3} = ({v1} {op1_name} {v2}) {op2_name} {v3} = {result} ← TARGET!")
                    except:
                        pass
