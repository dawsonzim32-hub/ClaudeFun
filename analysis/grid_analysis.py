"""
JCB Past and Future Box - Word Search Grid Analysis
Computational analysis of the 15x20 grid to find patterns and test theories.
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

# Key words with positions (row 1-indexed, col 1-indexed, direction)
CLUE_CANDIDATES = {
    "NORTH":     (4, 6, "←"),
    "WEST":      (7, 10, "←"),
    "QUARRY":    (13, 14, "→"),
    "SAPPHIRE":  (15, 13, "→"),
    "PEAKS":     (8, 8, "←"),
    "DIVIDE":    (7, 12, "↘"),
    "WATER":     (5, 20, "←"),
    "OHIO":      (6, 15, "↙"),
    "STATE":     (6, 6, "←"),
    "ESTATE":    (6, 7, "←"),
    "SQUARE":    (12, 10, "→"),
    "LINE":      (6, 16, "→"),
    "WALK":      (11, 11, "←"),
    "ROUND":     (3, 2, "→"),
    "DIRT":      (11, 20, "←"),
    "COUNT":     (2, 1, "↓"),
    "NINETEEN":  (1, 10, "→"),
    "THREE":     (2, 7, "↓"),
    "FIVE":      (10, 5, "→"),
    "ELEVEN":    (8, 1, "↓"),
    "TWELVE":    (9, 18, "←"),
    "NINE":      (1, 10, "→"),
    "ZERO":      (15, 7, "←"),
    "LILAC":     (1, 8, "←"),
    "LEMON":     (5, 8, "↗"),
    "EVEN":      (10, 1, "↓"),
    "HIRE":      (15, 17, "→"),
    "LIAR":      (3, 16, "→"),
    "RAIL":      (3, 19, "←"),
}

DIRS = {
    "→": (0, 1), "←": (0, -1),
    "↓": (1, 0), "↑": (-1, 0),
    "↘": (1, 1), "↙": (1, -1),
    "↗": (-1, 1), "↖": (-1, -1),
}

def get_cell(r, c):
    """Get letter at 1-indexed row, col. Returns None if out of bounds."""
    if 1 <= r <= 15 and 1 <= c <= 20:
        return GRID[r-1][c-1]
    return None

def extend_line(word, row, col, direction, before=10, after=10):
    """Extend the line of a word in both directions, reading all letters."""
    dr, dc = DIRS[direction]
    word_len = len(word)

    # Letters before the word (in reverse reading order)
    before_letters = []
    for i in range(1, before + 1):
        r = row - dr * i
        c = col - dc * i
        letter = get_cell(r, c)
        if letter:
            before_letters.insert(0, (letter, r, c))

    # The word itself
    word_letters = []
    for i in range(word_len):
        r = row + dr * i
        c = col + dc * i
        letter = get_cell(r, c)
        if letter:
            word_letters.append((letter, r, c))

    # Letters after the word
    after_letters = []
    for i in range(word_len, word_len + after):
        r = row + dr * i
        c = col + dc * i
        letter = get_cell(r, c)
        if letter:
            after_letters.append((letter, r, c))

    before_str = "".join(l[0] for l in before_letters)
    word_str = "".join(l[0] for l in word_letters)
    after_str = "".join(l[0] for l in after_letters)

    return before_str, word_str, after_str

def find_intersections():
    """Find where word lines cross each other in the grid."""
    # For each word, compute all cells it occupies
    word_cells = {}
    for word, (row, col, direction) in CLUE_CANDIDATES.items():
        dr, dc = DIRS[direction]
        cells = set()
        for i in range(len(word)):
            r = row + dr * i
            c = col + dc * i
            cells.add((r, c))
        word_cells[word] = cells

    # Find intersections
    words = list(word_cells.keys())
    intersections = []
    for i in range(len(words)):
        for j in range(i+1, len(words)):
            w1, w2 = words[i], words[j]
            shared = word_cells[w1] & word_cells[w2]
            if shared:
                for (r, c) in shared:
                    letter = get_cell(r, c)
                    intersections.append((w1, w2, r, c, letter))

    return intersections

def read_full_rows_and_cols():
    """Read interesting patterns in rows and columns."""
    print("=" * 60)
    print("FULL ROWS (left to right)")
    print("=" * 60)
    for i, row in enumerate(GRID, 1):
        print(f"  Row {i:2d}: {row}")

    print()
    print("=" * 60)
    print("FULL COLUMNS (top to bottom)")
    print("=" * 60)
    for c in range(20):
        col_str = "".join(GRID[r][c] for r in range(15))
        print(f"  Col {c+1:2d}: {col_str}")

def read_diagonals():
    """Read all diagonals of the grid."""
    print()
    print("=" * 60)
    print("DIAGONALS (top-left to bottom-right, ↘)")
    print("=" * 60)
    # Start from top row, each column
    for start_c in range(20):
        diag = []
        r, c = 0, start_c
        while r < 15 and c < 20:
            diag.append(GRID[r][c])
            r += 1
            c += 1
        if len(diag) >= 4:
            print(f"  Start(1,{start_c+1:2d}): {''.join(diag)}")
    # Start from left column (skip first row, already covered)
    for start_r in range(1, 15):
        diag = []
        r, c = start_r, 0
        while r < 15 and c < 20:
            diag.append(GRID[r][c])
            r += 1
            c += 1
        if len(diag) >= 4:
            print(f"  Start({start_r+1},1): {''.join(diag)}")

    print()
    print("=" * 60)
    print("DIAGONALS (top-right to bottom-left, ↙)")
    print("=" * 60)
    # Start from top row, each column
    for start_c in range(20):
        diag = []
        r, c = 0, start_c
        while r < 15 and c >= 0:
            diag.append(GRID[r][c])
            r += 1
            c -= 1
        if len(diag) >= 4:
            print(f"  Start(1,{start_c+1:2d}): {''.join(diag)}")
    # Start from right column (skip first row)
    for start_r in range(1, 15):
        diag = []
        r, c = start_r, 19
        while r < 15 and c >= 0:
            diag.append(GRID[r][c])
            r += 1
            c -= 1
        if len(diag) >= 4:
            print(f"  Start({start_r+1},20): {''.join(diag)}")

def test_line_extensions():
    """Test extending word lines to see hidden text."""
    print()
    print("=" * 60)
    print("LINE EXTENSIONS (before | WORD | after)")
    print("=" * 60)

    key_words = ["NORTH", "WEST", "QUARRY", "SAPPHIRE", "PEAKS",
                 "DIVIDE", "WATER", "OHIO", "SQUARE", "NINETEEN",
                 "THREE", "FIVE", "ELEVEN", "TWELVE", "COUNT",
                 "LINE", "WALK", "STATE", "ESTATE", "ROUND",
                 "ZERO", "NINE", "LILAC", "LEMON", "DIRT"]

    for word in key_words:
        if word in CLUE_CANDIDATES:
            row, col, direction = CLUE_CANDIDATES[word]
            before, w, after = extend_line(word, row, col, direction)
            print(f"  {word:12s} ({direction}): [{before}] | {w} | [{after}]")

def test_first_letters():
    """What if you take the first letter of each clue word?"""
    print()
    print("=" * 60)
    print("FIRST LETTER COMBINATIONS")
    print("=" * 60)

    geo_words = ["NORTH", "WEST", "QUARRY", "SAPPHIRE", "PEAKS",
                 "DIVIDE", "WATER", "OHIO", "SQUARE", "STATE", "DIRT",
                 "WALK", "LINE", "ROUND", "ESTATE", "RAIL"]

    from itertools import combinations
    # Try all 5-word combos of geographic words, check if first letters spell something
    interesting = []
    for combo in combinations(geo_words, 5):
        letters = "".join(w[0] for w in combo)
        # Check all permutations would be too many, just check sorted
        sorted_letters = "".join(sorted(letters))
        interesting.append((combo, letters, sorted_letters))

    # Just print all combos whose letters might form a word
    # For now, print a sample
    print(f"  Total 5-word combos: {len(interesting)}")
    print(f"  Sample combos and their first letters:")
    for combo, letters, _ in interesting[:20]:
        print(f"    {','.join(combo):50s} → {letters}")

def test_number_coordinates():
    """Test if the number words form GPS coordinates."""
    print()
    print("=" * 60)
    print("NUMBER-BASED COORDINATE THEORIES")
    print("=" * 60)

    numbers = {
        "ZERO": 0, "THREE": 3, "FIVE": 5, "NINE": 9,
        "ELEVEN": 11, "TWELVE": 12, "NINETEEN": 19
    }

    print(f"  Available numbers: {sorted(numbers.values())}")
    print(f"  → 0, 3, 5, 9, 11, 12, 19")
    print()

    # Ohio coordinates: roughly 38.5-42°N, 80.5-85°W
    # Try various arrangements
    theories = [
        ("39.1205 N, 83.1912 W", 39.1205, -83.1912, "THIRTY-NINE.TWELVE-O-FIVE N, EIGHTY-THREE.NINETEEN-TWELVE W"),
        ("39.1219 N, 83.0512 W", 39.1219, -83.0512, "39.TWELVE-NINETEEN N, 83.ZERO-FIVE-TWELVE W"),
        ("39.0511 N, 83.1219 W", 39.0511, -83.1219, "39.ZERO-FIVE-ELEVEN N, 83.TWELVE-NINETEEN W"),
        ("39.1912 N, 83.0511 W", 39.1912, -83.0511, "39.NINETEEN-TWELVE N, 83.ZERO-FIVE-ELEVEN W"),
        ("39.0512 N, 83.1119 W", 39.0512, -83.1119, "39.ZERO-FIVE-TWELVE N, 83.ELEVEN-NINETEEN W"),
        ("39.1119 N, 83.0512 W", 39.1119, -83.0512, "39.ELEVEN-NINETEEN N, 83.ZERO-FIVE-TWELVE W"),
        ("39.1152 N, 83.0319 W", 39.1152, -83.0319, "39 deg 11'52\" N, 83 deg 03'19\" W"),
        ("39.1953 N, 83.1112 W", 39.1953, -83.1112, "39 deg 19'53\" N (fudged), 83 deg 11'12\" W"),
        ("39.0305 N, 82.1912 W", 39.0305, -82.1912, "THREE-NINE.THREE-ZERO-FIVE N"),
    ]

    for label, lat, lon, explanation in theories:
        print(f"  {label}")
        print(f"    Logic: {explanation}")
        print()

    # Also test Montana (Sapphire Mountains area): ~46°N, 113°W
    print("  --- Montana theories ---")
    mt_theories = [
        ("46.1912 N, 113.0539 W", "Sapphire Mountain area"),
        ("46.0519 N, 113.1203 W", "Near Philipsburg"),
    ]
    for label, note in mt_theories:
        print(f"  {label} ({note})")

def analyze_word_positions():
    """Analyze the row/col positions of key words for patterns."""
    print()
    print("=" * 60)
    print("WORD POSITION ANALYSIS")
    print("=" * 60)

    for word, (row, col, direction) in sorted(CLUE_CANDIDATES.items()):
        dr, dc = DIRS[direction]
        end_r = row + dr * (len(word) - 1)
        end_c = col + dc * (len(word) - 1)
        print(f"  {word:12s}: Start({row:2d},{col:2d}) → End({end_r:2d},{end_c:2d})  Dir:{direction}  Len:{len(word)}")

def check_words_same_direction():
    """Group words by direction to test 'REMAIN STEADY' theory."""
    print()
    print("=" * 60)
    print("WORDS GROUPED BY DIRECTION ('REMAIN STEADY')")
    print("=" * 60)

    from collections import defaultdict
    by_dir = defaultdict(list)
    for word, (row, col, direction) in CLUE_CANDIDATES.items():
        by_dir[direction].append((word, row, col))

    for direction in ["→", "←", "↓", "↑", "↘", "↙", "↗", "↖"]:
        if direction in by_dir:
            words = by_dir[direction]
            print(f"\n  Direction {direction}:")
            for word, row, col in sorted(words, key=lambda x: (x[1], x[2])):
                print(f"    {word:12s} at ({row:2d},{col:2d})")

def check_column1_and_key_columns():
    """Check for hidden messages in specific columns."""
    print()
    print("=" * 60)
    print("NOTABLE COLUMN PATTERNS")
    print("=" * 60)

    for c in [1, 2, 5, 6, 7, 10, 14, 15, 20]:
        col_str = "".join(GRID[r][c-1] for r in range(15))
        col_rev = col_str[::-1]
        print(f"  Col {c:2d}: {col_str}  (rev: {col_rev})")

if __name__ == "__main__":
    read_full_rows_and_cols()
    read_diagonals()
    test_line_extensions()
    find_intersections_result = find_intersections()

    print()
    print("=" * 60)
    print("WORD INTERSECTIONS (where lines cross)")
    print("=" * 60)
    for w1, w2, r, c, letter in sorted(find_intersections_result):
        print(f"  {w1:12s} × {w2:12s} at ({r:2d},{c:2d}) = '{letter}'")

    test_first_letters()
    test_number_coordinates()
    analyze_word_positions()
    check_words_same_direction()
    check_column1_and_key_columns()
