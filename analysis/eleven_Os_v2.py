"""
Find which O's to exclude to get exactly 11 remaining.
User says: remove "middle X of O's" + OHIO O's = 11 remaining.
33 - excluded = 11, so excluded = 22.
OHIO contributes 2 O's, so middle X = 20. That's too many for a small cluster.

ALTERNATIVE: Maybe starting from a SUBSET of O's (the orange-highlighted ones
in the image, i.e., O's not used by any standard found word).
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

DIRS = {"→":(0,1), "←":(0,-1), "↓":(1,0), "↑":(-1,0),
        "↘":(1,1), "↙":(1,-1), "↗":(-1,1), "↖":(-1,-1)}

def get_cells(word, row, col, d):
    dr, dc = DIRS[d]
    return {(row+dr*i, col+dc*i) for i in range(len(word))}

# All O positions
all_Os = {(r+1,c+1) for r in range(15) for c in range(20) if GRID[r][c]=='O'}

# Words that use O cells (community list)
community_words = [
    ("NINETEEN",1,10,"→"), ("NINE",1,10,"→"), ("NINE",1,12,"←"),
    ("TEEN",1,14,"→"), ("FIVE",10,5,"→"), ("THREE",2,7,"↓"),
    ("THREE",12,20,"←"), ("ELEVEN",8,1,"↓"), ("TWELVE",9,18,"←"),
    ("ZERO",15,7,"←"), ("ZEROS",15,7,"←"), ("NORTH",4,6,"←"),
    ("WEST",7,10,"←"), ("STATE",6,6,"←"), ("ESTATE",6,7,"←"),
    ("ROUND",3,2,"→"), ("SQUARE",12,10,"→"), ("QUARRY",13,14,"→"),
    ("SAPPHIRE",15,13,"→"), ("PEAKS",8,8,"←"), ("WATER",5,20,"←"),
    ("DIRT",11,20,"←"), ("LILAC",1,8,"←"), ("COUNT",2,1,"↓"),
    ("DIVIDE",7,12,"↘"), ("LINE",6,16,"→"), ("LIAR",3,16,"→"),
    ("RAIL",3,19,"←"), ("WALK",11,11,"←"), ("LEMON",5,8,"↗"),
    ("HIRE",15,17,"→"), ("EVEN",10,1,"↓"),
]

# O's used by community words (WITHOUT Ohio)
used_O_no_ohio = set()
for word, row, col, d in community_words:
    for r, c in get_cells(word, row, col, d):
        if GRID[r-1][c-1] == 'O':
            used_O_no_ohio.add((r, c))

# O's available = all O's MINUS those used by community words (but KEEP Ohio's O's available)
ohio_Os = {(6, 15), (9, 12)}
available_Os = all_Os - used_O_no_ohio  # This includes Ohio's O's since Ohio not in list
# But add back Ohio's O's explicitly since user treats them separately
available_Os = all_Os - used_O_no_ohio | ohio_Os

print(f"Total O's: {len(all_Os)}")
print(f"O's used by community words (no Ohio): {len(used_O_no_ohio)}")
print(f"Available O's (including Ohio's): {len(available_Os)}")
print(f"Available: {sorted(available_Os)}")
print()

# Now from available_Os, remove OHIO + middle X = 11
# available - ohio - middle_x = 11
target_middle_size = len(available_Os) - 2 - 11  # 2 for ohio (if both still in available)
# But check: are both ohio O's in available?
ohio_in_available = ohio_Os & available_Os
print(f"Ohio O's in available set: {ohio_in_available}")
remaining_after_ohio = available_Os - ohio_Os
print(f"After removing Ohio: {len(remaining_after_ohio)} O's")
print(f"Need to remove {len(remaining_after_ohio) - 11} more as 'middle X'")
print()

# Which O's form the "middle X"?
middle_x_size = len(remaining_after_ohio) - 11
print(f"Middle X must be {middle_x_size} O's")
print(f"Remaining O's to choose from: {sorted(remaining_after_ohio)}")
print()

# Let's visualize all O's with their status
print("=" * 60)
print("ALL O's WITH STATUS")
print("=" * 60)
print(f"{'Pos':>8} {'Letter':>6} {'In Word?':>12} {'Ohio?':>6} {'Available?':>10}")
for r, c in sorted(all_Os):
    in_word = (r,c) in used_O_no_ohio
    is_ohio = (r,c) in ohio_Os
    avail = (r,c) in available_Os
    word_names = []
    for word, wr, wc, d in community_words:
        if (r,c) in get_cells(word, wr, wc, d):
            word_names.append(word)
    word_str = ",".join(word_names) if word_names else "-"
    print(f"({r:2d},{c:2d})  O      {word_str:>12}  {'OHIO' if is_ohio else '':>6}  {'YES' if avail else 'no':>10}")

# Visual grid of available O's
print()
print("=" * 60)
print(f"AVAILABLE O's ({len(available_Os)} total)")
print("After removing community-word O's, keeping Ohio separate")
print("=" * 60)
print("      ", end="")
for c in range(1, 21):
    print(f"{c:3d}", end="")
print()

for r in range(1, 16):
    print(f"  R{r:2d}: ", end="")
    for c in range(1, 21):
        letter = GRID[r-1][c-1]
        if (r,c) in ohio_Os:
            print("  H", end="")  # Ohio O
        elif (r,c) in remaining_after_ohio:
            print("  O", end="")  # Available (keeper candidate)
        elif letter == 'O':
            print("  .", end="")  # Used by community word
        else:
            print("  ·", end="")
    print()
print()
print("O = available, H = Ohio (to remove), . = used in word, · = not O")

# Now: if we need to remove middle_x_size O's, which ones are "middle"?
# Let's define "middle" as rows 5-11, cols 5-16 (the interior)
print()
print("=" * 60)
print("INTERIOR vs EDGE O's (from available set, after Ohio removed)")
print("=" * 60)

interior = set()
edge = set()
for r, c in remaining_after_ohio:
    # "Edge" = first/last 3 rows or first/last 4 cols
    if r <= 3 or r >= 13 or c <= 3 or c >= 18:
        edge.add((r, c))
    else:
        interior.add((r, c))

print(f"Interior O's: {len(interior)} → {sorted(interior)}")
print(f"Edge O's: {len(edge)} → {sorted(edge)}")
print(f"\nIf middle X = all interior: {len(interior)} removed, leaving {len(edge)} edge O's")

# Check if edge count = 11
if len(edge) == 11:
    print(f"\n*** MATCH! Edge O's = 11! ***")
    print(f"\nThe 11 O's:")
    for i, (r, c) in enumerate(sorted(edge), 1):
        print(f"  {i:2d}. ({r:2d},{c:2d}) = O")
