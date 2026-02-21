# Bloom — Cycle-Synced Fitness App

## What This Is

Bloom is a cycle-syncing fitness app with a virtual companion creature that transforms through seasonal forms mirroring hormonal phases. Market positioning: "Musa but for fitness." Musa (310K+ downloads, $30/yr subscription) proved the market for cycle-synced creature mechanics. Bloom fills the gap Musa's users complain about: actual guided workouts instead of meditation-only.

The prototype is a single-file React component (bloom-v7.jsx, ~1,846 lines) that went through six adversarial code review rounds plus a seventh round that fixed all critical bugs, added 6 new workouts, onboarding, floor-work substitutions, and atomic evolution logic. It is production-adjacent but not shipped — it's an interactive specification for building the real mobile app.

## Product Philosophy

Bloom is a fitness app that understands mental health — not a mental health app with fitness.

The moat against Musa is workout programming. Musa can add a "suggested workout" text card tomorrow. They can't build a guided workout experience with timer mechanics, coaching cues, exercise substitutions, and progression unlocks without building a second app inside their app. Never pivot toward meditation/journaling/breathwork as primary features — that's Musa's strongest territory.

However, the mental health layer lives inside the fitness experience:

- The 2-Min Bloom Reset is a mental health intervention disguised as a workout
- Coaching cues do emotional work, not just fitness instruction ("You showed up. That's the whole workout today.")
- The creature provides relational accountability, not gamification
- The phase system gives permission to match effort to your body instead of fighting it
- The quit confirmation uses "your progress won't be saved" not "you failed"

**Core insight:** For most women, the reason they don't work out during their period isn't physical — it's emotional. The reason they quit mid-workout isn't exhaustion — it's shame. The reason they don't come back tomorrow isn't laziness — it's the feeling that missing one day means the whole system is broken. Bloom addresses all three through design, not lectures.

When adding features, ask: Does this make the fitness experience more emotionally intelligent? If yes, build it. Does this replace fitness with a separate mental health feature? If yes, don't — that's Musa's job.

## Architecture

### Screen Routing

```
browse → preview → active → complete
```

All routing is conditional rendering in BloomApp based on screen state. No router library.

### State Management

Two layers:

**Persisted state (useReducer + localStorage):**

- `totalXP` (number) — lifetime XP
- `streak` (number) — consecutive workout completions, resets on quit
- `completedIds` (string[]) — global set of completed workout IDs, never resets
- `completedByPhase` ({ menstrual: n, follicular: n, ovulatory: n, luteal: n }) — per-phase completion counter for unlock system
- `modifiers` ({ lowImpactOnly: bool, noFloorWork: bool }) — safety settings
- `cycleStartDate` (string|null) — ISO date of last period start, used to auto-calculate current phase
- `cycleEvolutions` (number) — count of completed full-cycle evolutions
- `currentCyclePhases` ({ menstrual: bool, follicular: bool, ovulatory: bool, luteal: bool }) — tracks which phases have at least one workout completion in the current cycle
- `hasOnboarded` (bool) — whether user has completed the onboarding flow
- `reflections` (array) — [{ workoutId, phase, feeling, date }] — post-workout reflection data for future personalization
- `lastNotTodayDate` (string|null) — ISO date of last "not today" check-in, prevents multi-use per day

Reducer actions: `COMPLETE_WORKOUT`, `QUIT_WORKOUT`, `SET_MODIFIER`, `SET_CYCLE_START`, `RESET_CYCLE_PHASES`, `SET_ONBOARDED`, `RECORD_REFLECTION`, `NOT_TODAY`. Completion is fully atomic — XP, streak, dedup'd completedIds, phase count, currentCyclePhases, AND cycle evolution all update in one transition (v7 fix: no double-dispatch).

**Ephemeral state (useState):**

- `phase` — current menstrual phase (auto-calculated from cycleStartDate, or user-selected fallback)
- `screen` — current screen
- `selectedWorkout` — active workout object
- `lastBaseXP`, `lastBonusXP` — most recent workout results for completion screen
- `showSettings` — settings drawer visibility

### Timer Implementation (ActiveWorkout)

- `setInterval` with 1-second ticks
- `timerRef` holds interval handle
- `advancingRef` (boolean ref) prevents double-advance race condition when `timeLeft` hits 0
- Lock released via `useEffect(() => { advancingRef.current = false }, [exerciseIdx])` — only after React commits new index
- `xpRef` accumulates XP outside React batching; `xpDisplay` state mirrors it for rendering
- Defensive clearing: explicit null on pause, cleanup, skip, and completion — three layers of defense against zombie intervals

### Persistence

- localStorage key: `"bloom-app-state"`
- `loadPersistedState()` reads on mount with try/catch
- `persistState(state)` writes on every reducer state change via useEffect
- Only persists the reducer state fields (XP, streak, completions, modifiers, cycle data)

## Data Model

### Phase

```
PHASES[phaseKey] = {
  label, bg, bgGrad, surface, border, text, muted,
  accent, accentDark, glow,
  creature: { base, petals, petalAccent, eye, cheek }
}
```

Four phases: menstrual, follicular, ovulatory, luteal

### Workout

```
{
  id: "f1",
  title: "Foundation Build",
  subtitle: "Compound strength while estrogen rises",
  duration: "28 min",
  icon: "💪",
  difficulty: 3,
  xp: 32,
  warmupNote: "...",
  unlockReq: null | { phase: "follicular", workoutsNeeded: 2 },
  exercises: [...]
}
```

### Exercise

```
{
  name: "Goblet Squat",
  duration: 45,
  type: "strength" | "cardio" | "flow" | "hold" | "rest",
  cue: "Sit back like there's a chair behind you. Drive through heels.",
  icon: "🏋️",
  muscleGroup: "Quads/Glutes",
  impact: "low" | "high",
  floorRequired: true | false
}
```

### Substitutions

```
SUBSTITUTIONS = {
  "Squat Jumps": "Fast bodyweight squats",
  "Jumping Jacks": "Marching in place with arm raises",
  // ... 10 total high-impact to low-impact pairs
}
```

### Growth Stages

```
Seedling (0 XP) → Sprout (50) → Budding (150) → Blooming (350) → Radiant (700)
```

### Evolution Tiers (Cycle-Complete Evolution)

```
Cycle 1: Shimmer (subtle sparkle effect on petals)
Cycle 2: Aura (soft glow ring around creature)
Cycle 3: Crown (petal crown appears on top)
Cycle 4: Luminous (petals become translucent/glowing)
Cycle 5: Celestial (star particles orbit the creature)
Cycle 6+: Each adds a new orbital particle (infinite progression)
```

### XP Distribution

Deterministic: `Math.floor(workout.xp / realCount)` base per exercise, remainder distributed as +1 to first N exercises by index. Rest exercises award 0 XP. Total always equals `workout.xp` exactly.

Streak bonus: +10% when streak >= 3 (applied as bonusXP, shown separately on completion screen).

## Component Map

| Component | Props | Purpose |
|-----------|-------|---------|
| BloomApp | — | Root. Routing, reducer, persistence |
| WorkoutPreview | workout, phase, modifiers, onStart, onBack | Exercise list, context badges, modifier warnings, substitution preview |
| ActiveWorkout | workout, phase, modifiers, onComplete, onQuit, streakBonus | Timer, creature, exercise display, controls, live substitution |
| WorkoutComplete | workout, phase, baseXP, bonusXP, totalXP, cycleEvolutions, currentCyclePhases, onDone | Stats, growth progress, streak bonus, cycle progress ring |
| SettingsDrawer | modifiers, onSetModifier, phase, cycleStartDate, onSetCycleStart, onClose | Modifier toggles, cycle date input |
| PauseOverlay | phase, onResume | Pause screen with creature |
| BloomCreature | phase, mood, size, stage, evolutions | SVG creature with mood-based animation and evolution cosmetics |
| CircularTimer | timeLeft, totalTime, phase, size | Progress ring with countdown |
| CycleProgressRing | currentCyclePhases, phase | 4-segment ring showing phase completion toward evolution |
| PhaseVars | phase, children | Injects CSS custom properties |

## Design Principles

### Modifier Philosophy

Modifiers are advisory, not restrictive. When `lowImpactOnly` is true:

- **Browse:** workout cards show modifier conflict tag
- **Preview:** yellow warning box + substitution preview panel
- **Active:** exercise name/cue swapped to substitution, "Replacing: [original]" label shown
- Nothing is hidden or disabled. User always sees what they're getting.

### Three Dropout Points

Every UX decision maps to one of three dropout moments — and each is fundamentally emotional, not physical:

**1. "I opened the app but didn't start"** (emotion: overwhelm, "I can't today")
Phase-specific WHY card gives biological permission, Bloom creature waiting creates gentle accountability, preview shows everything upfront so nothing is unknown, unlock system creates curiosity

**2. "I started but quit mid-workout"** (emotion: shame, "I'm not enough")
Coaching cues are encouraging not commanding, creature inside timer ring provides company not judgment, Up Next preview eliminates "how much more?" anxiety, rest controls (+15s / Skip) remove guilt, pause overlay makes pausing feel intentional, quit confirmation gives a real choice

**3. "I finished but won't come back tomorrow"** (emotion: "missing one day breaks everything")
XP feeds visible creature growth (continuous progress, not pass/fail), streak + 10% bonus creates gentle loss aversion, phase rotation = organic variety so it never feels stale, unlock system = "what's next" curiosity, cycle-complete evolution creates 28-day forward pull

### Copy Voice

- Coaching cues are conversational, not commanding ("Sit back like there's a chair" not "Perform a squat")
- Science copy is softened ("tends to," "many people find," "may help")
- Creature personality is warm but not infantilizing
- Medical disclaimer present but styled as footnote, not warning banner
- Never use shame, guilt, or "push through it" language

### Accessibility (v6)

- Workout cards are `<button>` elements with `disabled` and `aria-label`
- All overlays have `role="dialog"`, `aria-label`, focus trap via `useOverlay` hook, Esc to close, prior focus restored on close
- Settings toggles have `role="switch"` and `aria-checked`
- Icon-only buttons have `aria-label`

## Conventions

### Styling

- All inline styles (no CSS modules, no styled-components)
- Phase colors accessed via `const t = PHASES[phase]` then `t.bg`, `t.accent`, etc.
- PhaseVars component injects CSS custom properties but most code still uses `t.*` directly
- Animations defined in `BloomStyles` component rendered at app root on ALL screens (v7 fix: v6 only rendered them on browse)
- `maxWidth: 430`, `margin: "0 auto"` on all screen root containers (phone-shell feel)

### Fonts

- Display: `'Cormorant Garamond', serif`
- UI: `'DM Sans', sans-serif`
- Loaded via `useFontLink()` hook
- Production should move font link to `index.html`

### Naming

- Phase keys: lowercase (menstrual, follicular, ovulatory, luteal)
- Workout IDs: phase initial + number (m0, m1, f1, f2, o1, l1)
- Exercise types: strength, cardio, flow, hold, rest

## Current Content Inventory

| Phase | Workouts | Exercises | Duration Range | Notes |
|-------|----------|-----------|----------------|-------|
| Menstrual | 3 (2-Min Reset, Gentle Restore, Seated Calm) | 25 | 2-7 min | All low-impact; Seated Calm has zero floor work |
| Follicular | 3 (Foundation Build, Cardio Ignite, Upper Body Sculpt) | 33 | 6-7 min | Progressive unlock; mix of strength + cardio |
| Ovulatory | 3 (Peak Power Circuit, Sprint Intervals, Full Body Power) | 32 | 5-7 min | Highest intensity; Full Body Power unlocks after 2 |
| Luteal | 3 (Steady State, Tension Release, Balance & Core) | 29 | 5-6 min | Moderate; Balance & Core unlocks after 2 |

12 workouts total, 119 exercises. All durations auto-calculated from exercise data (v7 fix: v6 had hardcoded lies).

## Known Gaps (Not Bugs — Missing Features)

### Critical for MVP

- [ ] Exercise demonstrations — video, animation, or illustration for each exercise
- [x] ~~More workouts~~ — v7: 12 workouts (3 per phase), 119 exercises
- [x] ~~Audio cues~~ — v7: Web Audio API. Countdown beeps (3-2-1), exercise transition tone, rest-end chime, completion C-E-G chord
- [ ] Mobile app wrapper — React Native or Expo

### Important for Retention

- [x] ~~Post-workout reflection~~ — v7: ReflectionScreen with 3 options (tough/just right/easy), phase-aware responses, persisted in reflections[]
- [x] ~~"Not today" check-in~~ — v7: dashed-border button on browse, awards 2 XP, phase-aware response, once-per-day guard via lastNotTodayDate, does NOT reset streak
- [x] ~~Streak-aware encouragement copy~~ — v7: getCreatureGreeting (4 streak tiers x 4 phases = 16 messages), getCompletionHeadline (streak-based), NOT_TODAY_RESPONSES (4 phase messages)
- [x] ~~Floor-work substitution map~~ — v7: FLOOR_SUBSTITUTIONS with 14 standing alternatives
- [ ] Backend — user accounts, cloud sync, analytics
- [ ] Push notifications
- [ ] Haptics
- [x] ~~Screen wake lock~~ — v7: useWakeLock hook via navigator.wakeLock API, re-requests on visibility change

### Nice to Have

- [ ] Workout editor
- [ ] Social features (Bloom garden sharing)
- [ ] Apple Health / Google Fit integration
- [ ] AI workout personalization
- [ ] Offline support / service worker

## Version History

| Version | Key Changes |
|---------|-------------|
| v1 | Initial prototype — full screen flow, timer, creature, 4 phases |
| v2 | Timer race conditions, stale XP closures, rest controls, growth stages, streak bonuses |
| v3 | PhaseVars, advancingRef timing fix, completedIds persistence, safety modifiers, font dedup |
| v4 | Defensive interval management, deterministic XP, progress bar fix, live substitution |
| v5 | Font loading hook, handleSkip defensive null, completedByPhase atomic, quit confirmation |
| v6 | Workout cards as button, focus trap + Esc on all overlays, useReducer, localStorage persistence |
| v7 | **Full audit + rebuild.** Fixed: hardcoded wrong durations → auto-calc from exercise data; keyframes only on browse → global BloomStyles on all screens; creature always Seedling in workout → passes real totalXP; noFloorWork toggle did nothing → FLOOR_SUBSTITUTIONS map with 14 standing alternatives; double-dispatch evolution race → atomic evolution in COMPLETE_WORKOUT reducer; setState-inside-setState timer anti-pattern → exerciseIdx effect; dead code + unused imports removed. Added: 6 new workouts (12 total, 3/phase); Onboarding screen with cycle date input; hasOnboarded persisted state; future-date guard in calculatePhase; noFloorWork conflict badge on workout cards; bloom-fadein animation. Then: Audio cue system (Web Audio API — countdown beeps, exercise transition, rest-end chime, C-E-G completion chord); screen wake lock (useWakeLock hook, re-requests on visibility change); post-workout reflection (ReflectionScreen with tough/just right/easy, phase-aware response copy, persisted reflections[]). Then: "Not Today" check-in (2 XP, once-per-day guard, phase-aware response, dashed button on browse); streak-aware copy system (getCreatureGreeting: 4 tiers x 4 phases = 16 greetings; getCompletionHeadline: streak-based celebration text; NOT_TODAY_RESPONSES: 4 phase messages). |

## File Structure (When Splitting)

```
src/
  data/
    phases.ts
    workouts.ts
    growth.ts
  components/
    BloomCreature.tsx
    CircularTimer.tsx
    CycleProgressRing.tsx
    PhaseVars.tsx
    PauseOverlay.tsx
    SettingsDrawer.tsx
    ActiveWorkout.tsx
    WorkoutPreview.tsx
    WorkoutComplete.tsx
  hooks/
    useFontLink.ts
    useOverlay.ts
    usePersistedReducer.ts
    useCyclePhase.ts
  state/
    reducer.ts
    persistence.ts
  App.tsx
```

## Monetization Context

Target pricing: $4.99-6.99/month or $29.99-49.99/year (freemium with premium unlocks). Musa charges $30/year. Bloom's workout content justifies higher pricing — people pay $12.99-19.99/month for Peloton/Sweat. Free tier: 1 workout per phase + creature. Premium: full library + advanced modifiers + custom workouts.

## Strategic Positioning

### Core Identity

Bloom is a **nervous-system-aware fitness companion** — not a mental health app, not a generic fitness app.

The positioning gap Bloom fills: every competitor is either emotionally sterile fitness (Nike Training Club, Fitbod, Apple Fitness+, Freeletics) or movement-adjacent mental health (Musa, Finch, Replika). Bloom sits in the gap as an **emotionally intelligent fitness system designed for nervous-system reality, not idealized consistency**.

### Embodiment vs. Reflection

The fundamental distinction from Musa:

- **Musa's loop:** feel → reflect → creature responds (reflection builds awareness)
- **Bloom's loop:** act → body changes → creature responds (embodiment builds agency)

Agency has stronger retention potential than awareness. If Bloom becomes Musa-like, Musa can outcompete immediately. If Bloom stays embodied, Musa cannot easily follow — because guided workout logic requires progression systems, timing mechanics, exercise substitution logic, intensity balancing, fatigue-aware structure, and real-time engagement.

### Competitive Moat

The prototype already contains the moat:

- Timer-driven guidance
- Structured exercise sequencing
- XP earned through physical completion
- Progression tied to effort, not intention

### What Strengthens the Moat

1. "Check-in without workout" option
2. Creature visibly weakens with inactivity (subtle, not punitive)
3. Creature visibly strengthens during workouts
4. Phase-specific creature behavior
5. Recovery earns XP too

### What to Avoid

- Chatbot companion
- Journaling as core mechanic
- Meditation-only progression paths
- Replacing workouts with reflection

## Cycle-Complete Evolution — Feature Spec

### Overview

The single highest-impact retention mechanic: **complete at least one workout in each of the four phases within a single menstrual cycle, and the creature permanently evolves.**

### Why This Is the Primary Retention Feature

- Creates a 28-day engagement floor without daily pressure
- Makes the hard phases valuable (2-Min Reset becomes gateway to evolution)
- Permanent, not punitive (evolutions accumulate, never lost)
- Solves the XP ceiling (infinite progression beyond Radiant at 700 XP)
- Only Bloom can do this (impossible without cycle tracking)

### Data Model

```javascript
// Added to persisted reducer state
cycleStartDate: null,           // ISO string "2026-02-01", set by user
cycleEvolutions: 0,             // lifetime count of completed cycle evolutions
currentCyclePhases: {           // resets each cycle
  menstrual: false,
  follicular: false,
  ovulatory: false,
  luteal: false
}
```

### Phase Auto-Calculation

```javascript
// Average cycle: 28 days
// Menstrual:   days 1-5
// Follicular:  days 6-13
// Ovulatory:   days 14-16
// Luteal:      days 17-28
function calculatePhase(cycleStartDate) {
  const dayOfCycle = daysSince(cycleStartDate) % 28 + 1;
  if (dayOfCycle <= 5) return "menstrual";
  if (dayOfCycle <= 13) return "follicular";
  if (dayOfCycle <= 16) return "ovulatory";
  return "luteal";
}
```

### Reducer Changes

```javascript
case "COMPLETE_WORKOUT":
  return {
    ...state,
    totalXP: state.totalXP + action.xp,
    streak: state.streak + 1,
    completedIds: [...new Set([...state.completedIds, action.workoutId])],
    completedByPhase: {
      ...state.completedByPhase,
      [action.phase]: state.completedByPhase[action.phase] + 1
    },
    currentCyclePhases: {
      ...state.currentCyclePhases,
      [action.phase]: true
    }
  };

case "SET_CYCLE_START":
  return {
    ...state,
    cycleStartDate: action.date,
    currentCyclePhases: { menstrual: false, follicular: false, ovulatory: false, luteal: false }
  };

case "EVOLVE_CREATURE":
  return {
    ...state,
    cycleEvolutions: state.cycleEvolutions + 1,
    currentCyclePhases: { menstrual: false, follicular: false, ovulatory: false, luteal: false }
  };
```

### Evolution Visual Tiers

| Cycle | Name | Visual Effect |
|-------|------|---------------|
| 1 | Shimmer | Subtle sparkle animation on petals |
| 2 | Aura | Soft glow ring around creature |
| 3 | Crown | Petal crown appears on top |
| 4 | Luminous | Petals become translucent/glowing |
| 5 | Celestial | Star particles orbit the creature |
| 6+ | Astral | Each adds one more orbital particle |

All evolution effects stack. A Cycle 5 creature has shimmer + aura + crown + luminous petals + orbiting stars.

### UI Touchpoints

**Browse screen:** Cycle Progress Ring below creature showing 4 segments (one per phase). Filled segments for completed phases, empty for remaining. Subtle pulse when 3 of 4 complete.

**Completion screen:** Phase completion message. If this triggers evolution: celebration animation, creature transforms in real-time. Evolution counter displayed.

**Settings drawer:** "When did your last period start?" date picker. Current cycle day display. Current evolution tier display.

### Cycle Rollover Logic

When calculatePhase() returns menstrual and previous phase was luteal:
1. Check if all four currentCyclePhases are true
2. If yes: dispatch EVOLVE_CREATURE
3. If no: just reset currentCyclePhases for the new cycle
4. Show appropriate message: evolution celebration or gentle "new cycle, fresh start"
