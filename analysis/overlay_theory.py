"""
Test the "COUNT ELEVEN ZEROS" overlay theory.
Column 1 spells COUNT + ELEVEN = instruction to count 11 O's.
Those O's form a grille cipher / overlay pattern.
"""

GRID = [
    "QVUCALILENINETEENBMA",  # Row 1
    "CRETEHTREAOUCSIFEVLE",  # Row 2
    "OROUNDHNIMIHSTOLIARO",  # Row 3
    "UHTRONROEOCEHSRARDWO",  # Row 4
    "NOUBTDELOELTLNTRETAW",  # Row 5
    "TETATSEONYNEOAOLINEO",  # Row 6
    "PMUEHTTSEWODAHREERET",  # Row 7
    "EONSKAEPTOOOILPASIEC",  # Row 8
    "LESDBNOORAOOEVLEWTSR",  # Row 9
    "ENTUFIVETNTNCOIUJTSO",  # Row 10
    "VRNIEMAKLAWESCODTRID",  # Row 11
    "EADTTEYOSSQUAREEERHT",  # Row 12
    "NMTOPLECEOHETQUARRYO",  # Row 13
    "NSIOSMIXZFDQBCCASLIY",  # Row 14
    "APSOREZNGQZPSAPPHIRE",  # Row 15
]

# Find ALL O positions (1-indexed)
all_Os = []
for r in range(15):
    for c in range(20):
        if GRID[r][c] == 'O':
            all_Os.append((r+1, c+1))

print(f"Total O's in grid: {len(all_Os)}")
print(f"Positions: {all_Os}")
print()

# Community word list - which cells does each word occupy?
DIRS = {"→":(0,1), "←":(0,-1), "↓":(1,0), "↑":(-1,0),
        "↘":(1,1), "↙":(1,-1), "↗":(-1,1), "↖":(-1,-1)}

community_words = [
    ("NINETEEN", 1, 10, "→"),
    ("NINE", 1, 10, "→"),
    ("NINE", 1, 12, "←"),
    ("TEEN", 1, 14, "→"),
    ("FIVE", 10, 5, "→"),
    ("THREE", 2, 7, "↓"),
    ("THREE", 12, 20, "←"),
    ("ELEVEN", 8, 1, "↓"),
    ("TWELVE", 9, 18, "←"),
    ("ZERO", 15, 7, "←"),
    ("ZEROS", 15, 7, "←"),
    ("NORTH", 4, 6, "←"),
    ("WEST", 7, 10, "←"),
    ("STATE", 6, 6, "←"),
    ("ESTATE", 6, 7, "←"),
    ("ROUND", 3, 2, "→"),
    ("SQUARE", 12, 10, "→"),
    ("QUARRY", 13, 14, "→"),
    ("SAPPHIRE", 15, 13, "→"),
    ("PEAKS", 8, 8, "←"),
    ("WATER", 5, 20, "←"),
    ("DIRT", 11, 20, "←"),
    ("LILAC", 1, 8, "←"),
    ("COUNT", 2, 1, "↓"),
    ("DIVIDE", 7, 12, "↘"),
    ("LINE", 6, 16, "→"),
    ("LIAR", 3, 16, "→"),
    ("RAIL", 3, 19, "←"),
    ("WALK", 11, 11, "←"),
    ("LEMON", 5, 8, "↗"),
    ("HIRE", 15, 17, "→"),
    ("EVEN", 10, 1, "↓"),
    ("OHIO", 6, 15, "↙"),
]

def get_word_cells(word, row, col, direction):
    """Get all (row, col) cells for a word."""
    dr, dc = DIRS[direction]
    cells = []
    for i in range(len(word)):
        r = row + dr * i
        c = col + dc * i
        cells.append((r, c))
    return cells

# Find all cells used by community words
used_cells = set()
used_O_cells = set()

for word, row, col, direction in community_words:
    cells = get_word_cells(word, row, col, direction)
    for r, c in cells:
        used_cells.add((r, c))
        if GRID[r-1][c-1] == 'O':
            used_O_cells.add((r, c))

print(f"O's used by community words: {len(used_O_cells)}")
print(f"Used O positions: {sorted(used_O_cells)}")
print()

# Free O's (not used by any word)
free_Os = [pos for pos in all_Os if pos not in used_O_cells]
print(f"FREE O's (not in any community word): {len(free_Os)}")
print(f"Positions: {free_Os}")
print()

# OHIO specifically
ohio_cells = get_word_cells("OHIO", 6, 15, "↙")
ohio_Os = [(r,c) for r,c in ohio_cells if GRID[r-1][c-1] == 'O']
print(f"OHIO uses O's at: {ohio_Os}")
print()

# What if we remove OHIO's O's from the free set?
free_Os_no_ohio = [pos for pos in all_Os if pos not in used_O_cells]
print(f"Free O's (after removing all community words including OHIO): {len(free_Os_no_ohio)}")
print()

# Let's also check: O's NOT in any word at all (including automated solver)
all_words = [
    ("LILAC", 1, 8, "←"), ("NINE", 1, 10, "→"), ("NINETEEN", 1, 10, "→"),
    ("NINE", 1, 12, "←"), ("TEEN", 1, 14, "→"), ("COUNT", 2, 1, "↓"),
    ("THREE", 2, 7, "↓"), ("OMELET", 2, 11, "↙"), ("ROUND", 3, 2, "→"),
    ("LOTS", 3, 16, "←"), ("LIAR", 3, 16, "→"), ("RAIL", 3, 19, "←"),
    ("TUTU", 4, 3, "↓"), ("TRON", 4, 3, "→"), ("NORTH", 4, 6, "←"),
    ("TONE", 5, 5, "↑"), ("LEMON", 5, 8, "↗"), ("LESS", 5, 11, "↗"),
    ("WATER", 5, 20, "←"), ("STAT", 6, 6, "←"), ("STATE", 6, 6, "←"),
    ("ESTATE", 6, 7, "←"), ("ESTATE", 6, 7, "↘"),
    ("YEOMAN", 6, 10, "↑"), ("OHIO", 6, 15, "↙"), ("LINE", 6, 16, "→"),
    ("TELE", 7, 6, "↗"), ("SOLO", 7, 8, "↑"), ("STAT", 7, 8, "↘"),
    ("STATE", 7, 8, "↘"), ("WEST", 7, 10, "←"), ("OWES", 7, 11, "←"),
    ("DIVI", 7, 12, "↘"), ("DIVIDE", 7, 12, "↘"), ("DIVIDER", 7, 12, "↘"),
    ("ELEVEN", 8, 1, "↓"), ("EONS", 8, 1, "→"), ("KETO", 8, 5, "↖"),
    ("ANIME", 8, 6, "↓"), ("PEAK", 8, 8, "←"), ("PEAKS", 8, 8, "←"),
    ("TATE", 8, 9, "↘"), ("IOTA", 8, 13, "↙"), ("VIDE", 9, 14, "↘"),
    ("TWELVE", 9, 18, "←"), ("EVEN", 10, 1, "↓"), ("FIVE", 10, 5, "→"),
    ("RAMS", 11, 2, "↓"), ("MEIN", 11, 6, "←"), ("AERO", 11, 7, "↗"),
    ("WALK", 11, 11, "←"), ("DOCS", 11, 16, "←"), ("DIVI", 11, 16, "↖"),
    ("DIRT", 11, 20, "←"), ("DOSE", 12, 3, "↘"), ("SQUARE", 12, 10, "→"),
    ("HISS", 12, 19, "↑"), ("THREE", 12, 20, "←"), ("COKE", 13, 8, "↑"),
    ("QUARRY", 13, 14, "→"), ("SORE", 15, 3, "→"), ("ROTA", 15, 5, "↖"),
    ("EROS", 15, 6, "←"), ("ZERO", 15, 7, "←"), ("ZEROS", 15, 7, "←"),
    ("SAPPHIRE", 15, 13, "→"), ("HIRE", 15, 17, "→"),
]

all_used_cells = set()
all_used_O_cells = set()
for word, row, col, direction in all_words:
    cells = get_word_cells(word, row, col, direction)
    for r, c in cells:
        all_used_cells.add((r, c))
        if GRID[r-1][c-1] == 'O':
            all_used_O_cells.add((r, c))

fully_free_Os = [pos for pos in all_Os if pos not in all_used_O_cells]
print(f"O's used by ALL words (including automated solver): {len(all_used_O_cells)}")
print(f"Used O positions: {sorted(all_used_O_cells)}")
print()
print(f"FULLY FREE O's (not in ANY word): {len(fully_free_Os)}")
print(f"Positions: {fully_free_Os}")
print()

# Visualize the free O's on the grid
print("=" * 60)
print("GRID WITH FREE O's MARKED (community words removed)")
print("=" * 60)
print("     ", end="")
for c in range(1, 21):
    print(f"{c:3d}", end="")
print()

for r in range(1, 16):
    print(f"R{r:2d}: ", end="")
    for c in range(1, 21):
        letter = GRID[r-1][c-1]
        if letter == 'O' and (r,c) not in used_O_cells:
            print(f"  *", end="")  # Free O
        elif letter == 'O' and (r,c) in used_O_cells:
            print(f"  .", end="")  # Used O
        else:
            print(f"  {letter}", end="")
    print()

print()
print("* = FREE O (not used in any community word)")
print(". = O used in a community word")

# Same but for ALL words
print()
print("=" * 60)
print("GRID WITH FREE O's MARKED (ALL solver words removed)")
print("=" * 60)
print("     ", end="")
for c in range(1, 21):
    print(f"{c:3d}", end="")
print()

for r in range(1, 16):
    print(f"R{r:2d}: ", end="")
    for c in range(1, 21):
        letter = GRID[r-1][c-1]
        if letter == 'O' and (r,c) not in all_used_O_cells:
            print(f"  *", end="")  # Free O
        elif letter == 'O':
            print(f"  .", end="")  # Used O
        else:
            print(f"  {letter}", end="")
    print()

print()
print("* = FREE O (not used in ANY word)")
print(". = O used in some word")

# What letters surround each free O? (adjacent cells)
print()
print("=" * 60)
print("LETTERS ADJACENT TO EACH FREE O (community words)")
print("=" * 60)
for r, c in free_Os:
    adjacent = []
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            if dr == 0 and dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if 1 <= nr <= 15 and 1 <= nc <= 20:
                adjacent.append((GRID[nr-1][nc-1], nr, nc))
    adj_letters = "".join(a[0] for a in adjacent)
    print(f"  O at ({r:2d},{c:2d}): adjacent = {adj_letters}")

# Count O's by column (for "on the side" analysis)
print()
print("=" * 60)
print("O's BY COLUMN")
print("=" * 60)
from collections import Counter
col_counts = Counter(c for r,c in all_Os)
for col in sorted(col_counts.keys()):
    free_in_col = sum(1 for r,cc in free_Os if cc == col)
    print(f"  Col {col:2d}: {col_counts[col]} total O's, {free_in_col} free")

# Count O's by row
print()
print("=" * 60)
print("O's BY ROW")
print("=" * 60)
row_counts = Counter(r for r,c in all_Os)
for row in sorted(row_counts.keys()):
    free_in_row = sum(1 for rr,c in free_Os if rr == row)
    print(f"  Row {row:2d}: {row_counts[row]} total O's, {free_in_row} free")

# Test: which subset of words, when removed, leaves EXACTLY 11 free O's?
print()
print("=" * 60)
print("HOW MANY O's ARE FREE WITH DIFFERENT WORD SETS?")
print("=" * 60)

# Start with NO words removed
print(f"  No words removed: {len(all_Os)} free O's")

# Community words only
print(f"  Community words removed: {len(free_Os)} free O's")

# All solver words
print(f"  All solver words removed: {len(fully_free_Os)} free O's")

# Community words WITHOUT Ohio
community_no_ohio = [w for w in community_words if w[0] != "OHIO"]
used_no_ohio = set()
for word, row, col, direction in community_no_ohio:
    for r, c in get_word_cells(word, row, col, direction):
        if GRID[r-1][c-1] == 'O':
            used_no_ohio.add((r, c))
free_no_ohio = [pos for pos in all_Os if pos not in used_no_ohio]
print(f"  Community words WITHOUT Ohio: {len(free_no_ohio)} free O's")

# What if we also remove O's used in the anagram message?
# The anagram: "THERE ARE FIVE CLUES IN THIS WORD SEARCH DO NOT TELL ANYONE LINE THEM UP THERE ARE NO SPECIAL BENDS OR TURNS JUST REMAIN STEADY TO COMPLETE THE MISSION"
anagram = "THEREAREFIVECLUESINTHISWORDSEARCHDONOTTELLANYONELINETHEMUPTHEREARENOSPECIALBENDSORTURNS JUSTREMAINSTEADYTOCOMPLETE THEMISSION"
anagram_clean = anagram.replace(" ", "")
anagram_O_count = anagram_clean.count('O')
print(f"\n  O's in anagram message: {anagram_O_count}")
print(f"  Free O's after community words: {len(free_Os)}")
print(f"  Free O's minus anagram O's: {len(free_Os) - anagram_O_count}")

# Exact anagram text
anagram_v1 = "THEREAREFIVECLUESINTHISWORDSEARCHDONOTTELLANYONE LINETHEMUPTHEREARENOSPECIALBENDSORTURNS JUSTREMAINSTEADYTOCOMPLETETHEMISSION"
anagram_v1_clean = anagram_v1.replace(" ", "")
o_count_v1 = anagram_v1_clean.count('O')
print(f"\n  Anagram V1: '{anagram_v1}'")
print(f"  O count in V1: {o_count_v1}")
print(f"  Free O's ({len(free_Os)}) - anagram O's ({o_count_v1}) = {len(free_Os) - o_count_v1}")

anagram_v2 = "THEREAREFIVECLUESINTHISWORDSEARCHDONOTTELLANYONE THREEAREONSPECIALBENDSORTURNS JUSTREMAINSTEADYTOCOMPLETETHEMISSION"
anagram_v2_clean = anagram_v2.replace(" ", "")
o_count_v2 = anagram_v2_clean.count('O')
print(f"\n  Anagram V2: '{anagram_v2}'")
print(f"  O count in V2: {o_count_v2}")
print(f"  Free O's ({len(free_Os)}) - anagram O's ({o_count_v2}) = {len(free_Os) - o_count_v2}")
