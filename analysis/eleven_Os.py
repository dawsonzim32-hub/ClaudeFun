"""
Test: 33 O's - middle X cluster - OHIO O's = 11?
"""

GRID = [
    "QVUCALILENINETEENBMA",
    "CRETEHTREAOUCSIFEVLE",
    "OROUNDHNIMIHSTOLIARO",
    "UHTRONROEOCEHSRARDWO",
    "NOUBTDELOELTLNTRETAW",
    "TETATSEONYNEOAOLINEO",
    "PMUEHTTSEWODAHREERET",
    "EONSKAEPTOOOILPASIEC",
    "LESDBNOORAOOEVLEWTSR",
    "ENTUFIVETNTNCOIUJTSO",
    "VRNIEMAKLAWESCODTRID",
    "EADTTEYOSSQUAREEERHT",
    "NMTOPLECEOHETQUARRYO",
    "NSIOSMIXZFDQBCCASLIY",
    "APSOREZNGQZPSAPPHIRE",
]

# All O positions
all_Os = set()
for r in range(15):
    for c in range(20):
        if GRID[r][c] == 'O':
            all_Os.add((r+1, c+1))

print(f"Total O's: {len(all_Os)}")

# OHIO O's: O(6,15), H(7,14), I(8,13), O(9,12)
ohio_Os = {(6, 15), (9, 12)}
print(f"OHIO O's: {sorted(ohio_Os)}")

# The "middle X" — the cluster of O's in the center of the grid (rows 7-9)
# Let's try different definitions and see which gives 11
middle_candidates = {
    (7, 11),   # R7
    (8, 2),    # R8
    (8, 10),   # R8
    (8, 11),   # R8
    (8, 12),   # R8
    (9, 7),    # R9
    (9, 8),    # R9
    (9, 11),   # R9
    (9, 12),   # R9 (also OHIO)
}

print(f"\nAll middle-area O's (R7-R9): {sorted(middle_candidates)}")
print(f"Count: {len(middle_candidates)}")

# Try different "middle X" definitions
# The X shape could be various subsets
from itertools import combinations

print("\n" + "=" * 60)
print("TESTING WHICH 'MIDDLE X' GIVES EXACTLY 11 REMAINING")
print("=" * 60)

for size in range(3, 10):
    for middle_x in combinations(sorted(middle_candidates), size):
        middle_set = set(middle_x)
        removed = middle_set | ohio_Os
        remaining = all_Os - removed
        if len(remaining) == 11:
            print(f"\n  Middle X ({size} cells): {sorted(middle_set)}")
            print(f"  + OHIO Os: {sorted(ohio_Os)}")
            print(f"  Total removed: {len(removed)} (overlap: {len(middle_set & ohio_Os)})")
            print(f"  REMAINING 11 O's: {sorted(remaining)}")

            # Visualize
            print(f"\n  Grid visualization:")
            print(f"       ", end="")
            for c in range(1, 21):
                print(f"{c:3d}", end="")
            print()
            for r in range(1, 16):
                print(f"  R{r:2d}: ", end="")
                for c in range(1, 21):
                    if (r,c) in remaining:
                        print("  O", end="")
                    elif (r,c) in middle_set:
                        print("  x", end="")
                    elif (r,c) in ohio_Os:
                        print("  h", end="")
                    elif GRID[r-1][c-1] == 'O':
                        print("  .", end="")
                    else:
                        print("  ·", end="")
                print()
            print("  O = keeper, x = middle X, h = OHIO, . = other O, · = non-O")
