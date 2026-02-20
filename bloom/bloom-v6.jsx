import React, { useState, useReducer, useEffect, useRef, useCallback, useMemo } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PHASES = {
  menstrual: {
    label: "Menstrual", bg: "#FFF0F0", bgGrad: "linear-gradient(135deg, #FFF0F0, #FFE4E8)",
    surface: "#FFF8F8", border: "#FFD0D6", text: "#5C2434", muted: "#B07080",
    accent: "#E8788A", accentDark: "#C4556A", glow: "rgba(232,120,138,0.3)",
    creature: { base: "#F7C5CC", petals: "#E8788A", petalAccent: "#D4556B", eye: "#5C2434", cheek: "#F0A0AA" }
  },
  follicular: {
    label: "Follicular", bg: "#F0FFF4", bgGrad: "linear-gradient(135deg, #F0FFF4, #E0F8E8)",
    surface: "#F8FFF8", border: "#B0E0C0", text: "#1A3C2A", muted: "#6B9B7A",
    accent: "#4CAF6E", accentDark: "#3A8C56", glow: "rgba(76,175,110,0.3)",
    creature: { base: "#B8E0C8", petals: "#4CAF6E", petalAccent: "#3A8C56", eye: "#1A3C2A", cheek: "#A0D8B0" }
  },
  ovulatory: {
    label: "Ovulatory", bg: "#FFFCF0", bgGrad: "linear-gradient(135deg, #FFFCF0, #FFF3D0)",
    surface: "#FFFEF8", border: "#F0D870", text: "#4A3800", muted: "#9B8840",
    accent: "#F0B830", accentDark: "#D0A020", glow: "rgba(240,184,48,0.3)",
    creature: { base: "#F8E8A0", petals: "#F0B830", petalAccent: "#D0A020", eye: "#4A3800", cheek: "#F5D870" }
  },
  luteal: {
    label: "Luteal", bg: "#F4F0FF", bgGrad: "linear-gradient(135deg, #F4F0FF, #E8E0F8)",
    surface: "#FAF8FF", border: "#C8B8E8", text: "#2A1850", muted: "#8070A0",
    accent: "#8B6CC0", accentDark: "#6A4CA0", glow: "rgba(139,108,192,0.3)",
    creature: { base: "#D0C0E8", petals: "#8B6CC0", petalAccent: "#6A4CA0", eye: "#2A1850", cheek: "#C0A8D8" }
  }
};

const PHASE_KEYS = ["menstrual", "follicular", "ovulatory", "luteal"];

const PHASE_SCIENCE = {
  menstrual: { title: "Why gentle movement helps now", body: "During menstruation, progesterone and estrogen are at their lowest. Many people find that gentle movement tends to ease cramps and improve mood without overtaxing your body." },
  follicular: { title: "Why building strength works now", body: "Rising estrogen during the follicular phase may support muscle recovery and energy. Many people find this is a great time for progressive strength work." },
  ovulatory: { title: "Why peak effort feels right now", body: "Estrogen peaks around ovulation, and many people experience their highest energy and strength. High-intensity work tends to feel most natural during this window." },
  luteal: { title: "Why steady effort matters now", body: "Rising progesterone in the luteal phase can affect energy and mood. Steady, moderate movement tends to help manage PMS symptoms and maintain consistency." }
};

const BLOOM_STAGES = [
  { name: "Seedling", minXP: 0 },
  { name: "Sprout", minXP: 50 },
  { name: "Budding", minXP: 150 },
  { name: "Blooming", minXP: 350 },
  { name: "Radiant", minXP: 700 }
];

// Evolution tier names for cycle-complete evolutions
const EVOLUTION_TIERS = [
  { name: "Shimmer", description: "Subtle sparkle on petals" },
  { name: "Aura", description: "Soft glow ring" },
  { name: "Crown", description: "Petal crown" },
  { name: "Luminous", description: "Translucent petals" },
  { name: "Celestial", description: "Orbiting stars" }
  // 6+: "Astral" — each adds one more orbital particle
];

function getBloomStage(xp) {
  for (let i = BLOOM_STAGES.length - 1; i >= 0; i--) {
    if (xp >= BLOOM_STAGES[i].minXP) return BLOOM_STAGES[i];
  }
  return BLOOM_STAGES[0];
}

function getNextStage(xp) {
  for (let i = 0; i < BLOOM_STAGES.length; i++) {
    if (xp < BLOOM_STAGES[i].minXP) return BLOOM_STAGES[i];
  }
  return null;
}

function getEvolutionTier(evolutions) {
  if (evolutions <= 0) return null;
  if (evolutions <= EVOLUTION_TIERS.length) return EVOLUTION_TIERS[evolutions - 1];
  // Beyond tier 5: "Astral" with particle count
  return { name: "Astral", description: `${evolutions - 4} orbital particles` };
}

const SUBSTITUTIONS = {
  "Squat Jumps": "Fast bodyweight squats",
  "Jumping Jacks": "Marching in place with arm raises",
  "Box Jumps": "Step-ups at a brisk pace",
  "Burpees": "Squat to standing reach",
  "High Knees": "Marching with high knees (no hop)",
  "Jump Lunges": "Alternating reverse lunges",
  "Tuck Jumps": "Fast air squats",
  "Mountain Climbers": "Standing knee drives",
  "Plyo Push-ups": "Regular push-ups with pause",
  "Star Jumps": "Standing lateral arm raises with calf raise"
};

// ─── WORKOUTS ────────────────────────────────────────────────────────────────

const WORKOUTS = {
  menstrual: [
    {
      id: "m0", title: "2-Min Bloom Reset", subtitle: "A micro-dose of movement for low days",
      duration: "2 min", icon: "🌸", difficulty: 1, xp: 8, warmupNote: "No warmup needed — this is already gentle.",
      unlockReq: null,
      exercises: [
        { name: "Standing Cat-Cow", duration: 30, type: "flow", cue: "Hands on thighs. Round your spine on exhale, arch gently on inhale.", icon: "🧘", muscleGroup: "Spine", impact: "low", floorRequired: false },
        { name: "Shoulder Rolls", duration: 20, type: "flow", cue: "Big slow circles. Let tension melt out of your neck.", icon: "🔄", muscleGroup: "Shoulders", impact: "low", floorRequired: false },
        { name: "Side Stretch", duration: 25, type: "flow", cue: "Reach one arm overhead, lean gently. Breathe into the stretch.", icon: "🌿", muscleGroup: "Obliques", impact: "low", floorRequired: false },
        { name: "Rest", duration: 10, type: "rest", cue: "You showed up. That's the whole workout today.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Gentle Twist", duration: 25, type: "flow", cue: "Feet planted, rotate your torso side to side. Easy and loose.", icon: "🔄", muscleGroup: "Spine", impact: "low", floorRequired: false },
        { name: "Deep Breathing", duration: 20, type: "flow", cue: "In for 4, hold for 4, out for 6. You're done.", icon: "🌬️", muscleGroup: "Core", impact: "low", floorRequired: false }
      ]
    },
    {
      id: "m1", title: "Gentle Restore", subtitle: "Ease tension without taxing your body",
      duration: "15 min", icon: "🧘", difficulty: 2, xp: 18, warmupNote: "Start with gentle breathing — your body will guide the pace.",
      unlockReq: null,
      exercises: [
        { name: "Diaphragmatic Breathing", duration: 40, type: "flow", cue: "Hand on belly. Breathe deep into your hand. Slow exhale.", icon: "🌬️", muscleGroup: "Core", impact: "low", floorRequired: false },
        { name: "Neck Circles", duration: 30, type: "flow", cue: "Slow, gentle circles. Pause anywhere that feels tight.", icon: "🔄", muscleGroup: "Neck", impact: "low", floorRequired: false },
        { name: "Cat-Cow", duration: 45, type: "flow", cue: "On all fours. Arch and round with your breath.", icon: "🐱", muscleGroup: "Spine", impact: "low", floorRequired: true },
        { name: "Rest", duration: 20, type: "rest", cue: "Take a moment. No rush.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Child's Pose", duration: 50, type: "hold", cue: "Knees wide, arms forward. Breathe into your lower back.", icon: "🧘", muscleGroup: "Back/Hips", impact: "low", floorRequired: true },
        { name: "Supine Twist", duration: 45, type: "flow", cue: "On your back, knees to one side. Let gravity do the work.", icon: "🔄", muscleGroup: "Spine", impact: "low", floorRequired: true },
        { name: "Rest", duration: 15, type: "rest", cue: "Almost there. You're doing great.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Hip Circles", duration: 40, type: "flow", cue: "Standing or all fours. Gentle circles with your hips.", icon: "🔄", muscleGroup: "Hips", impact: "low", floorRequired: false },
        { name: "Figure-4 Stretch", duration: 50, type: "hold", cue: "Ankle on opposite knee. Gentle pull toward you.", icon: "🦵", muscleGroup: "Glutes/Hips", impact: "low", floorRequired: true },
        { name: "Legs Up the Wall", duration: 60, type: "hold", cue: "Legs up, back flat. Close your eyes if you want.", icon: "🦶", muscleGroup: "Legs/Back", impact: "low", floorRequired: true },
        { name: "Final Rest", duration: 30, type: "rest", cue: "You gave your body exactly what it needed today.", icon: "🌸", muscleGroup: "", impact: "low", floorRequired: false }
      ]
    }
  ],
  follicular: [
    {
      id: "f1", title: "Foundation Build", subtitle: "Compound strength while estrogen rises",
      duration: "28 min", icon: "💪", difficulty: 3, xp: 32, warmupNote: "Light cardio + dynamic stretches to prep your joints.",
      unlockReq: null,
      exercises: [
        { name: "Arm Circles", duration: 30, type: "flow", cue: "Big circles forward, then back. Wake up those shoulders.", icon: "🔄", muscleGroup: "Shoulders", impact: "low", floorRequired: false },
        { name: "Bodyweight Squats", duration: 40, type: "strength", cue: "Feet shoulder-width. Sit back like there's a chair. Drive through heels.", icon: "🏋️", muscleGroup: "Quads/Glutes", impact: "low", floorRequired: false },
        { name: "Push-ups", duration: 40, type: "strength", cue: "Hands just outside shoulders. Lower with control. Knees down is totally fine.", icon: "💪", muscleGroup: "Chest/Triceps", impact: "low", floorRequired: true },
        { name: "Rest", duration: 30, type: "rest", cue: "Shake it out. Sip water if you need.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Goblet Squat", duration: 45, type: "strength", cue: "Hold weight at chest. Sit deep, elbows inside knees.", icon: "🏋️", muscleGroup: "Quads/Glutes", impact: "low", floorRequired: false },
        { name: "Bent-Over Row", duration: 45, type: "strength", cue: "Hinge at hips, pull elbows back. Squeeze shoulder blades together.", icon: "💪", muscleGroup: "Back/Biceps", impact: "low", floorRequired: false },
        { name: "Rest", duration: 25, type: "rest", cue: "You're building something. Rest is part of it.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Lunges", duration: 45, type: "strength", cue: "Step forward, lower until both knees at 90°. Alternate legs.", icon: "🦵", muscleGroup: "Quads/Glutes", impact: "low", floorRequired: false },
        { name: "Plank Hold", duration: 35, type: "hold", cue: "Forearms down, body straight as a board. Breathe.", icon: "🧱", muscleGroup: "Core", impact: "low", floorRequired: true },
        { name: "Rest", duration: 20, type: "rest", cue: "Last push coming up. You've got this.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Glute Bridge", duration: 40, type: "strength", cue: "On your back, feet flat. Drive hips up, squeeze at top.", icon: "🍑", muscleGroup: "Glutes/Hamstrings", impact: "low", floorRequired: true },
        { name: "Cool Down Stretch", duration: 45, type: "flow", cue: "Slow stretches for whatever feels tight. You earned this.", icon: "🧘", muscleGroup: "Full Body", impact: "low", floorRequired: false }
      ]
    },
    {
      id: "f2", title: "Cardio Ignite", subtitle: "Elevate your heart rate while energy climbs",
      duration: "22 min", icon: "🔥", difficulty: 3, xp: 28,
      warmupNote: "Light jog in place + arm swings to get blood flowing.",
      unlockReq: { phase: "follicular", workoutsNeeded: 2 },
      exercises: [
        { name: "Jumping Jacks", duration: 40, type: "cardio", cue: "Classic! Arms all the way up, land soft.", icon: "⭐", muscleGroup: "Full Body", impact: "high", floorRequired: false },
        { name: "High Knees", duration: 35, type: "cardio", cue: "Drive knees up fast. Pump those arms.", icon: "🏃", muscleGroup: "Core/Legs", impact: "high", floorRequired: false },
        { name: "Rest", duration: 25, type: "rest", cue: "Breathe. Heart rate coming down is normal.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Mountain Climbers", duration: 35, type: "cardio", cue: "Plank position, drive knees to chest. Fast feet!", icon: "🏔️", muscleGroup: "Core/Shoulders", impact: "high", floorRequired: true },
        { name: "Squat Jumps", duration: 30, type: "cardio", cue: "Squat deep, explode up. Land soft, repeat.", icon: "🚀", muscleGroup: "Quads/Glutes", impact: "high", floorRequired: false },
        { name: "Rest", duration: 30, type: "rest", cue: "Halfway there. You're crushing it.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Burpees", duration: 35, type: "cardio", cue: "Down, jump feet back, push-up, jump up. Modify as needed.", icon: "💥", muscleGroup: "Full Body", impact: "high", floorRequired: true },
        { name: "Fast Feet", duration: 30, type: "cardio", cue: "Quick small steps in place. Stay light on your toes.", icon: "👟", muscleGroup: "Calves/Cardio", impact: "low", floorRequired: false },
        { name: "Rest", duration: 20, type: "rest", cue: "Last round. Give what you've got left.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Star Jumps", duration: 30, type: "cardio", cue: "Jump and spread arms and legs wide like a star!", icon: "🌟", muscleGroup: "Full Body", impact: "high", floorRequired: false },
        { name: "Cool Down Walk", duration: 40, type: "flow", cue: "Walk in place. Slow it down. Let your heart rate settle.", icon: "🚶", muscleGroup: "Recovery", impact: "low", floorRequired: false }
      ]
    }
  ],
  ovulatory: [
    {
      id: "o1", title: "Peak Power Circuit", subtitle: "Maximum output when your body is primed",
      duration: "25 min", icon: "⚡", difficulty: 5, xp: 38,
      warmupNote: "Dynamic warmup — high knees, arm swings, hip openers.",
      unlockReq: null,
      exercises: [
        { name: "Dynamic Warmup", duration: 40, type: "cardio", cue: "Jog in place, arm swings, hip circles. Get loose.", icon: "🔄", muscleGroup: "Full Body", impact: "low", floorRequired: false },
        { name: "Jump Lunges", duration: 35, type: "cardio", cue: "Lunge, jump, switch legs mid-air. Land soft!", icon: "🚀", muscleGroup: "Quads/Glutes", impact: "high", floorRequired: false },
        { name: "Plyo Push-ups", duration: 30, type: "strength", cue: "Push up explosively, hands leave the ground. Beast mode.", icon: "💥", muscleGroup: "Chest/Triceps", impact: "high", floorRequired: true },
        { name: "Rest", duration: 25, type: "rest", cue: "Quick breather. You're operating at peak.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Tuck Jumps", duration: 30, type: "cardio", cue: "Jump and bring knees to chest. Soft landing every time.", icon: "🦘", muscleGroup: "Core/Legs", impact: "high", floorRequired: false },
        { name: "Squat Jumps", duration: 35, type: "cardio", cue: "Deep squat, explosive jump. This is your peak — own it.", icon: "🔥", muscleGroup: "Quads/Glutes", impact: "high", floorRequired: false },
        { name: "Rest", duration: 30, type: "rest", cue: "Halfway. You're doing things most people won't.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Burpees", duration: 40, type: "cardio", cue: "Full burpees. Down, back, push-up, jump. All out.", icon: "💥", muscleGroup: "Full Body", impact: "high", floorRequired: true },
        { name: "Mountain Climbers", duration: 35, type: "cardio", cue: "Fast! Drive those knees. Core tight.", icon: "🏔️", muscleGroup: "Core/Shoulders", impact: "high", floorRequired: true },
        { name: "Cool Down", duration: 50, type: "flow", cue: "Deep stretches. You just peaked. Let your body land gently.", icon: "🧘", muscleGroup: "Full Body", impact: "low", floorRequired: false }
      ]
    }
  ],
  luteal: [
    {
      id: "l1", title: "Steady State", subtitle: "Moderate consistency as progesterone rises",
      duration: "20 min", icon: "🌙", difficulty: 3, xp: 24,
      warmupNote: "Gentle cardio — walking in place, arm circles, easy twists.",
      unlockReq: null,
      exercises: [
        { name: "Walking in Place", duration: 40, type: "cardio", cue: "Easy pace. Swing your arms naturally.", icon: "🚶", muscleGroup: "Full Body", impact: "low", floorRequired: false },
        { name: "Wall Sit", duration: 35, type: "hold", cue: "Back flat against wall, thighs parallel. Hold steady.", icon: "🧱", muscleGroup: "Quads", impact: "low", floorRequired: false },
        { name: "Standing Row", duration: 40, type: "strength", cue: "Slight hinge, pull elbows back. Squeeze your back.", icon: "💪", muscleGroup: "Back", impact: "low", floorRequired: false },
        { name: "Rest", duration: 25, type: "rest", cue: "Steady does it. No need to rush.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Step-ups", duration: 40, type: "strength", cue: "Use a stair or sturdy surface. Alternate legs.", icon: "🪜", muscleGroup: "Quads/Glutes", impact: "low", floorRequired: false },
        { name: "Shoulder Press", duration: 35, type: "strength", cue: "Press overhead, lower with control. Use water bottles if no weights.", icon: "🏋️", muscleGroup: "Shoulders", impact: "low", floorRequired: false },
        { name: "Rest", duration: 20, type: "rest", cue: "You're more than halfway. Consistency is strength.", icon: "💛", muscleGroup: "", impact: "low", floorRequired: false },
        { name: "Glute Bridge", duration: 40, type: "strength", cue: "Drive hips up, squeeze at top. Controlled lowering.", icon: "🍑", muscleGroup: "Glutes", impact: "low", floorRequired: true },
        { name: "Standing Side Stretch", duration: 30, type: "flow", cue: "Reach up and over. Breathe into the stretch.", icon: "🌿", muscleGroup: "Obliques", impact: "low", floorRequired: false },
        { name: "Final Stretch", duration: 40, type: "flow", cue: "Stretch whatever needs it most. You showed up and that matters.", icon: "🧘", muscleGroup: "Full Body", impact: "low", floorRequired: false }
      ]
    }
  ]
};

// ─── HOOKS ───────────────────────────────────────────────────────────────────

// Load Google Fonts once
function useFontLink() {
  useEffect(() => {
    if (document.querySelector('[data-bloom-fonts]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap";
    link.dataset.bloomFonts = "true";
    document.head.appendChild(link);
  }, []);
}

// Focus trap + Esc to close for overlays
function useOverlay(isOpen, onClose) {
  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;

      const overlay = overlayRef.current;
      if (!overlay) return;
      const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element
    const overlay = overlayRef.current;
    if (overlay) {
      const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) setTimeout(() => focusable[0].focus(), 50);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current) previousFocusRef.current.focus();
    };
  }, [isOpen, onClose]);

  return overlayRef;
}

// ─── PHASE CALCULATION ───────────────────────────────────────────────────────

// Calculate current menstrual phase from cycle start date
// Average cycle: 28 days — Menstrual: 1-5, Follicular: 6-13, Ovulatory: 14-16, Luteal: 17-28
function calculatePhase(cycleStartDate) {
  if (!cycleStartDate) return null;
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayOfCycle = (diffDays % 28) + 1;
  if (dayOfCycle <= 5) return "menstrual";
  if (dayOfCycle <= 13) return "follicular";
  if (dayOfCycle <= 16) return "ovulatory";
  return "luteal";
}

function getCycleDay(cycleStartDate) {
  if (!cycleStartDate) return null;
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return (Math.floor(diffMs / (1000 * 60 * 60 * 24)) % 28) + 1;
}

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  totalXP: 0,
  streak: 0,
  completedIds: [],
  completedByPhase: { menstrual: 0, follicular: 0, ovulatory: 0, luteal: 0 },
  modifiers: { lowImpactOnly: false, noFloorWork: false },
  // Cycle-Complete Evolution fields
  cycleStartDate: null,
  cycleEvolutions: 0,
  currentCyclePhases: { menstrual: false, follicular: false, ovulatory: false, luteal: false }
};

function appReducer(state, action) {
  switch (action.type) {
    case "COMPLETE_WORKOUT": {
      const newCompletedIds = [...new Set([...state.completedIds, action.workoutId])];
      return {
        ...state,
        totalXP: state.totalXP + action.xp,
        streak: state.streak + 1,
        completedIds: newCompletedIds,
        completedByPhase: {
          ...state.completedByPhase,
          [action.phase]: state.completedByPhase[action.phase] + 1
        },
        // Mark this phase as done for current cycle evolution tracking
        currentCyclePhases: {
          ...state.currentCyclePhases,
          [action.phase]: true
        }
      };
    }
    case "QUIT_WORKOUT":
      return { ...state, streak: 0 };
    case "SET_MODIFIER":
      return { ...state, modifiers: { ...state.modifiers, [action.key]: action.value } };
    case "SET_CYCLE_START":
      return {
        ...state,
        cycleStartDate: action.date,
        // Reset cycle phase tracking when user sets a new cycle start
        currentCyclePhases: { menstrual: false, follicular: false, ovulatory: false, luteal: false }
      };
    case "EVOLVE_CREATURE":
      return {
        ...state,
        cycleEvolutions: state.cycleEvolutions + 1,
        currentCyclePhases: { menstrual: false, follicular: false, ovulatory: false, luteal: false }
      };
    case "RESET_CYCLE_PHASES":
      return {
        ...state,
        currentCyclePhases: { menstrual: false, follicular: false, ovulatory: false, luteal: false }
      };
    default:
      return state;
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem("bloom-app-state");
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state) {
  try {
    localStorage.setItem("bloom-app-state", JSON.stringify(state));
  } catch { /* localStorage full or unavailable */ }
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

// Injects CSS custom properties for current phase
function PhaseVars({ phase, children }) {
  const t = PHASES[phase];
  const style = {
    "--bloom-bg": t.bg, "--bloom-surface": t.surface, "--bloom-border": t.border,
    "--bloom-text": t.text, "--bloom-muted": t.muted, "--bloom-accent": t.accent,
    "--bloom-accent-dark": t.accentDark, "--bloom-glow": t.glow
  };
  return <div style={style}>{children}</div>;
}

// Circular countdown timer with progress ring
function CircularTimer({ timeLeft, totalTime, phase, size = 160 }) {
  const t = PHASES[phase];
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? (1 - timeLeft / totalTime) : 0;
  const offset = circumference * (1 - progress);
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={t.border} strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={t.accent}
        strokeWidth={6} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.3s ease" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: size * 0.22,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fill: t.text }}>
        {mins}:{secs.toString().padStart(2, "0")}
      </text>
    </svg>
  );
}

// 4-segment ring showing cycle phase completion progress toward evolution
function CycleProgressRing({ currentCyclePhases, phase, size = 80 }) {
  const t = PHASES[phase];
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / 4;
  const gapLength = 4;
  const completed = Object.values(currentCyclePhases).filter(Boolean).length;
  const almostDone = completed === 3;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {PHASE_KEYS.map((pk, i) => {
          const phaseT = PHASES[pk];
          const filled = currentCyclePhases[pk];
          const startOffset = i * segmentLength;
          return (
            <circle key={pk} cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={filled ? phaseT.accent : phaseT.border}
              strokeWidth={filled ? 5 : 3} strokeLinecap="round"
              strokeDasharray={`${segmentLength - gapLength} ${circumference - segmentLength + gapLength}`}
              strokeDashoffset={-startOffset}
              style={{
                opacity: filled ? 1 : 0.4,
                transition: "all 0.4s ease",
                ...(almostDone && !filled ? { animation: "bloom-pulse 2s ease-in-out infinite" } : {})
              }} />
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: t.muted, textAlign: "center" }}>
        {completed}/4
      </div>
    </div>
  );
}

// SVG creature with phase-based colors, mood animation, growth stage, and evolution cosmetics
function BloomCreature({ phase, mood = "idle", size = 120, stage = "Seedling", evolutions = 0 }) {
  const t = PHASES[phase];
  const c = t.creature;
  const scale = stage === "Seedling" ? 0.7 : stage === "Sprout" ? 0.8 : stage === "Budding" ? 0.9 : 1.0;
  const petalCount = stage === "Seedling" ? 3 : stage === "Sprout" ? 4 : stage === "Budding" ? 5 : 6;
  const bounce = mood === "active" ? "bloom-bounce 0.6s ease-in-out infinite" : mood === "happy" ? "bloom-wiggle 0.8s ease-in-out 3" : "none";

  // Evolution visual effects
  const showShimmer = evolutions >= 1;
  const showAura = evolutions >= 2;
  const showCrown = evolutions >= 3;
  const showLuminous = evolutions >= 4;
  const orbitalCount = evolutions >= 5 ? (evolutions - 4) : 0;

  return (
    <div style={{ animation: bounce, display: "inline-block" }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Aura glow ring (evolution 2+) */}
        {showAura && (
          <circle cx={60} cy={60} r={55} fill="none" stroke={t.glow} strokeWidth={3}
            style={{ animation: "bloom-glow 3s ease-in-out infinite" }} />
        )}

        <g transform={`translate(60,60) scale(${scale})`}>
          {/* Petals */}
          {Array.from({ length: petalCount }).map((_, i) => {
            const angle = (360 / petalCount) * i;
            return (
              <ellipse key={i} cx={0} cy={-28} rx={12} ry={20}
                fill={i % 2 === 0 ? c.petals : c.petalAccent}
                opacity={showLuminous ? 0.7 : 0.9}
                transform={`rotate(${angle})`}
                style={showShimmer ? { animation: `bloom-shimmer 2s ease-in-out ${i * 0.2}s infinite` } : {}} />
            );
          })}

          {/* Crown (evolution 3+) */}
          {showCrown && (
            <g transform="translate(0, -42)">
              {[-12, 0, 12].map((x, i) => (
                <ellipse key={i} cx={x} cy={-6} rx={4} ry={8}
                  fill={c.petalAccent} opacity={0.85}
                  transform={`rotate(${(i - 1) * 15})`} />
              ))}
            </g>
          )}

          {/* Body */}
          <circle cx={0} cy={0} r={22} fill={c.base} />
          {/* Eyes */}
          <circle cx={-7} cy={-4} r={3} fill={c.eye} />
          <circle cx={7} cy={-4} r={3} fill={c.eye} />
          {/* Eye highlights */}
          <circle cx={-6} cy={-5} r={1} fill="#fff" />
          <circle cx={8} cy={-5} r={1} fill="#fff" />
          {/* Cheeks */}
          <circle cx={-14} cy={4} r={4} fill={c.cheek} opacity={0.5} />
          <circle cx={14} cy={4} r={4} fill={c.cheek} opacity={0.5} />
          {/* Smile */}
          <path d="M-5,6 Q0,12 5,6" fill="none" stroke={c.eye} strokeWidth={1.5} strokeLinecap="round" />
        </g>

        {/* Orbital particles (evolution 5+) */}
        {Array.from({ length: orbitalCount }).map((_, i) => (
          <circle key={`orb-${i}`} cx={60} cy={10} r={2.5} fill={c.petals}
            style={{ animation: `bloom-orbit ${3 + i * 0.5}s linear infinite`, transformOrigin: "60px 60px" }} />
        ))}
      </svg>
    </div>
  );
}

function PauseOverlay({ phase, onResume }) {
  const t = PHASES[phase];
  const overlayRef = useOverlay(true, onResume);
  return (
    <div ref={overlayRef} role="dialog" aria-label="Workout paused" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: t.surface, borderRadius: 24, padding: 40, textAlign: "center", maxWidth: 300 }}>
        <BloomCreature phase={phase} mood="idle" size={80} />
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: t.text, margin: "16px 0 8px" }}>Paused</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.muted, margin: "0 0 20px" }}>Take your time. Your Bloom is waiting.</p>
        <button onClick={onResume} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 12,
          padding: "12px 32px", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Resume
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS DRAWER ─────────────────────────────────────────────────────────

function SettingsDrawer({ modifiers, onSetModifier, phase, cycleStartDate, onSetCycleStart, cycleEvolutions, onClose }) {
  const t = PHASES[phase];
  const overlayRef = useOverlay(true, onClose);
  const cycleDay = getCycleDay(cycleStartDate);
  const evolutionTier = getEvolutionTier(cycleEvolutions);

  return (
    <div ref={overlayRef} role="dialog" aria-label="Settings" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
      <div style={{ width: 320, background: t.surface, height: "100%", padding: 24, overflowY: "auto",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: t.text, margin: 0 }}>Settings</h3>
          <button onClick={onClose} aria-label="Close settings" style={{
            background: "none", border: "none", fontSize: 24, cursor: "pointer", color: t.muted }}>×</button>
        </div>

        {/* Cycle Date Input */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 8 }}>
            Cycle Tracking
          </h4>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, display: "block", marginBottom: 6 }}>
            When did your last period start?
          </label>
          <input type="date" value={cycleStartDate || ""} onChange={(e) => onSetCycleStart(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.text, background: t.bg, boxSizing: "border-box" }} />
          {cycleDay && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, marginTop: 6 }}>
              Cycle day {cycleDay} — {PHASES[calculatePhase(cycleStartDate)].label} phase
            </p>
          )}
        </div>

        {/* Evolution Status */}
        {cycleEvolutions > 0 && (
          <div style={{ marginBottom: 24, padding: 12, background: t.bg, borderRadius: 12, border: `1px solid ${t.border}` }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: t.text, margin: 0 }}>
              Evolution {cycleEvolutions}: {evolutionTier?.name}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: "4px 0 0" }}>
              {evolutionTier?.description}
            </p>
          </div>
        )}

        {/* Safety Modifiers */}
        <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>
          Safety Modifiers
        </h4>
        {[
          { key: "lowImpactOnly", label: "Low impact only", desc: "Replace jumping and high-impact exercises" },
          { key: "noFloorWork", label: "No floor work", desc: "Replace exercises that require lying down" }
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: `1px solid ${t.border}` }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.text, margin: 0 }}>{label}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: "2px 0 0" }}>{desc}</p>
            </div>
            <button role="switch" aria-checked={modifiers[key]} onClick={() => onSetModifier(key, !modifiers[key])}
              style={{ width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                background: modifiers[key] ? t.accent : t.border, position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute",
                top: 3, left: modifiers[key] ? 23 : 3, transition: "left 0.2s" }} />
            </button>
          </div>
        ))}

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.muted, marginTop: 24, lineHeight: 1.5 }}>
          This app is not medical advice. Cycle phases are estimates based on a 28-day average.
          Consult a healthcare provider for personalized guidance.
        </p>
      </div>
    </div>
  );
}

// ─── WORKOUT PREVIEW ─────────────────────────────────────────────────────────

function WorkoutPreview({ workout, phase, modifiers, onStart, onBack }) {
  const t = PHASES[phase];
  const sci = PHASE_SCIENCE[phase];

  // Check for modifier conflicts
  const hasHighImpact = workout.exercises.some(e => e.impact === "high" && e.type !== "rest");
  const hasFloorWork = workout.exercises.some(e => e.floorRequired && e.type !== "rest");
  const showImpactWarning = modifiers.lowImpactOnly && hasHighImpact;
  const showFloorWarning = modifiers.noFloorWork && hasFloorWork;

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: 20, background: t.bg, minHeight: "100vh" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 16, color: t.muted,
        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>
        ← Back
      </button>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 40 }}>{workout.icon}</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: t.text, margin: "8px 0 4px" }}>
          {workout.title}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.muted, margin: 0 }}>{workout.subtitle}</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted }}>{workout.duration}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ display: "inline-block", width: 12, height: 4, borderRadius: 2, marginRight: 2,
                background: i < workout.difficulty ? t.accent : t.border }} />
            ))}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.accent, fontWeight: 600 }}>+{workout.xp} XP</span>
        </div>
      </div>

      {/* Science card */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: t.accent, margin: "0 0 6px" }}>
          {sci.title}
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, margin: 0, lineHeight: 1.5 }}>
          {sci.body}
        </p>
      </div>

      {/* Modifier warnings */}
      {(showImpactWarning || showFloorWarning) && (
        <div style={{ background: "#FFFBE6", border: "1px solid #F0D870", borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#7A6200", margin: "0 0 4px" }}>
            Modifier active
          </p>
          {showImpactWarning && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#7A6200", margin: "2px 0" }}>
            High-impact exercises will be substituted with low-impact alternatives.
          </p>}
          {showFloorWarning && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#7A6200", margin: "2px 0" }}>
            Floor exercises will be substituted with standing alternatives.
          </p>}
        </div>
      )}

      {/* Warmup note */}
      {workout.warmupNote && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, marginBottom: 16, fontStyle: "italic" }}>
          {workout.warmupNote}
        </p>
      )}

      {/* Exercise list */}
      <div style={{ marginBottom: 24 }}>
        {workout.exercises.map((ex, i) => {
          const substituted = modifiers.lowImpactOnly && ex.impact === "high" && SUBSTITUTIONS[ex.name];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0",
              borderBottom: i < workout.exercises.length - 1 ? `1px solid ${t.border}` : "none" }}>
              <span style={{ fontSize: 20, marginRight: 12 }}>{ex.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.text, margin: 0, fontWeight: 500 }}>
                  {substituted || ex.name}
                </p>
                {substituted && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.muted, margin: "2px 0 0" }}>
                    Replacing: {ex.name}
                  </p>
                )}
                {ex.muscleGroup && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.muted, margin: "2px 0 0" }}>
                    {ex.muscleGroup}
                  </p>
                )}
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted }}>{ex.duration}s</span>
            </div>
          );
        })}
      </div>

      <button onClick={onStart} style={{ width: "100%", padding: "16px", background: t.accent, color: "#fff",
        border: "none", borderRadius: 16, fontSize: 18, fontWeight: 700, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif" }}>
        Start Workout
      </button>
    </div>
  );
}

// ─── ACTIVE WORKOUT ──────────────────────────────────────────────────────────

function ActiveWorkout({ workout, phase, modifiers, onComplete, onQuit, streakBonus }) {
  const t = PHASES[phase];
  const stage = getBloomStage(0); // Will get real XP from parent

  // Get exercises with substitutions applied
  const exercises = useMemo(() => {
    if (!workout?.exercises?.length) return [];
    return workout.exercises.map(ex => {
      if (modifiers.lowImpactOnly && ex.impact === "high" && SUBSTITUTIONS[ex.name]) {
        return { ...ex, name: SUBSTITUTIONS[ex.name], originalName: ex.name, cue: `Low-impact version of ${ex.name}. Same movement pattern, gentler on joints.` };
      }
      return ex;
    });
  }, [workout, modifiers]);

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exercises[0]?.duration || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [xpDisplay, setXpDisplay] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const timerRef = useRef(null);
  const advancingRef = useRef(false);
  const xpRef = useRef(0);

  // Guard: no exercises
  if (!exercises.length) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p>No exercises found in this workout.</p>
        <button onClick={onQuit}>Back</button>
      </div>
    );
  }

  const currentEx = exercises[exerciseIdx];
  const isRest = currentEx?.type === "rest";
  const progress = (exerciseIdx + 1) / exercises.length;

  // Calculate per-exercise XP (deterministic distribution)
  const realExercises = exercises.filter(e => e.type !== "rest");
  const realCount = realExercises.length || 1;
  const basePerExercise = Math.floor(workout.xp / realCount);
  const remainder = workout.xp - basePerExercise * realCount;

  function getExerciseXP(idx) {
    const ex = exercises[idx];
    if (!ex || ex.type === "rest") return 0;
    const realIdx = realExercises.indexOf(ex);
    return basePerExercise + (realIdx < remainder ? 1 : 0);
  }

  // Clear any existing timer
  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Release advancingRef lock when exerciseIdx changes
  useEffect(() => {
    advancingRef.current = false;
  }, [exerciseIdx]);

  // Timer tick
  useEffect(() => {
    if (isPaused) { clearTimer(); return; }

    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!advancingRef.current) {
            advancingRef.current = true;
            // Award XP for this exercise
            const earned = getExerciseXP(exerciseIdx);
            if (earned > 0) {
              xpRef.current += earned;
              setXpDisplay(xpRef.current);
            }
            // Advance or complete
            if (exerciseIdx < exercises.length - 1) {
              setExerciseIdx(exerciseIdx + 1);
              setTimeLeft(exercises[exerciseIdx + 1].duration);
            } else {
              clearTimer();
              const bonusXP = streakBonus ? Math.floor(xpRef.current * 0.1) : 0;
              onComplete(xpRef.current, bonusXP);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [exerciseIdx, isPaused]);

  function handlePause() { setIsPaused(true); clearTimer(); }
  function handleResume() { setIsPaused(false); }

  function handleSkip() {
    clearTimer();
    if (exerciseIdx < exercises.length - 1) {
      const earned = getExerciseXP(exerciseIdx);
      if (earned > 0) { xpRef.current += earned; setXpDisplay(xpRef.current); }
      advancingRef.current = true;
      setExerciseIdx(exerciseIdx + 1);
      setTimeLeft(exercises[exerciseIdx + 1]?.duration || 30);
    } else {
      const bonusXP = streakBonus ? Math.floor(xpRef.current * 0.1) : 0;
      onComplete(xpRef.current, bonusXP);
    }
  }

  function handleAddTime() { setTimeLeft(prev => prev + 15); }

  function handleQuitConfirm() {
    clearTimer();
    onQuit();
  }

  // Next exercise preview
  const nextEx = exerciseIdx < exercises.length - 1 ? exercises[exerciseIdx + 1] : null;

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: 20, background: t.bg, minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => setShowQuitConfirm(true)} aria-label="Quit workout" style={{
          background: "none", border: "none", fontSize: 14, color: t.muted, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif" }}>
          ← Quit
        </button>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.accent, fontWeight: 600 }}>
          +{xpDisplay} XP
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: t.border, borderRadius: 2, marginBottom: 24 }}>
        <div style={{ height: 4, background: t.accent, borderRadius: 2, width: `${progress * 100}%`,
          transition: "width 0.3s ease" }} />
      </div>

      {/* Timer + creature */}
      <div style={{ textAlign: "center", marginBottom: 24, position: "relative" }}>
        <CircularTimer timeLeft={timeLeft} totalTime={currentEx.duration} phase={phase} size={180} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", marginTop: 6 }}>
          <BloomCreature phase={phase} mood={isRest ? "idle" : "active"} size={60} stage={stage.name} />
        </div>
      </div>

      {/* Exercise info */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{currentEx.icon}</span>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: t.text, margin: "8px 0 4px" }}>
          {currentEx.name}
        </h3>
        {currentEx.originalName && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: "0 0 4px" }}>
            Replacing: {currentEx.originalName}
          </p>
        )}
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.muted, margin: 0, lineHeight: 1.5, padding: "0 20px" }}>
          {currentEx.cue}
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        {isRest && (
          <button onClick={handleAddTime} style={{ background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 12, padding: "10px 20px", fontSize: 14, cursor: "pointer", color: t.text,
            fontFamily: "'DM Sans', sans-serif" }}>
            +15s
          </button>
        )}
        <button onClick={isPaused ? handleResume : handlePause} style={{
          background: t.accent, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px",
          fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button onClick={handleSkip} style={{ background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 12, padding: "10px 20px", fontSize: 14, cursor: "pointer", color: t.text,
          fontFamily: "'DM Sans', sans-serif" }}>
          Skip →
        </button>
      </div>

      {/* Next up */}
      {nextEx && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12,
          display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{nextEx.icon}</span>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: 0 }}>Up next</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.text, margin: 0, fontWeight: 500 }}>
              {nextEx.name}
            </p>
          </div>
          <span style={{ marginLeft: "auto", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted }}>
            {nextEx.duration}s
          </span>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && <PauseOverlay phase={phase} onResume={handleResume} />}

      {/* Quit confirmation */}
      {showQuitConfirm && (
        <div role="dialog" aria-label="Quit confirmation" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: t.surface, borderRadius: 20, padding: 28, textAlign: "center", maxWidth: 280 }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: t.text, margin: "0 0 8px" }}>
              End workout?
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, margin: "0 0 20px" }}>
              Your progress won't be saved.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowQuitConfirm(false)} style={{
                flex: 1, padding: "10px", background: t.surface, border: `1px solid ${t.border}`,
                borderRadius: 10, fontSize: 14, cursor: "pointer", color: t.text, fontFamily: "'DM Sans', sans-serif" }}>
                Keep going
              </button>
              <button onClick={handleQuitConfirm} style={{
                flex: 1, padding: "10px", background: t.accent, color: "#fff", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WORKOUT COMPLETE ────────────────────────────────────────────────────────

function WorkoutComplete({ workout, phase, baseXP, bonusXP, totalXP, cycleEvolutions, currentCyclePhases, justEvolved, onDone }) {
  const t = PHASES[phase];
  const stage = getBloomStage(totalXP);
  const next = getNextStage(totalXP);
  const evolutionTier = getEvolutionTier(cycleEvolutions);
  const phasesComplete = Object.values(currentCyclePhases).filter(Boolean).length;

  // Check if this workout just completed a new phase for the cycle
  const phaseJustCompleted = currentCyclePhases[phase];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: 20, background: t.bgGrad, minHeight: "100vh", textAlign: "center" }}>
      <div style={{ paddingTop: 40 }}>
        <BloomCreature phase={phase} mood="happy" size={140} stage={stage.name} evolutions={cycleEvolutions} />
      </div>

      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: t.text, margin: "20px 0 8px" }}>
        {justEvolved ? "Your Bloom Evolved!" : "Workout Complete!"}
      </h2>

      {justEvolved && evolutionTier && (
        <div style={{ background: t.surface, border: `2px solid ${t.accent}`, borderRadius: 16, padding: 16,
          margin: "12px auto 20px", maxWidth: 280, animation: "bloom-glow 2s ease-in-out infinite" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: t.accent, margin: "0 0 4px", fontWeight: 700 }}>
            Evolution {cycleEvolutions}: {evolutionTier.name}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, margin: 0 }}>
            {evolutionTier.description}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: "8px 0 0" }}>
            You completed a workout in every phase this cycle. This evolution is permanent.
          </p>
        </div>
      )}

      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.text, margin: "0 0 4px" }}>
        {workout.title}
      </p>

      {/* XP breakdown */}
      <div style={{ background: t.surface, borderRadius: 16, padding: 20, margin: "20px auto", maxWidth: 280,
        border: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.muted }}>Workout XP</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.text, fontWeight: 600 }}>+{baseXP}</span>
        </div>
        {bonusXP > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.accent }}>Streak bonus</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.accent, fontWeight: 600 }}>+{bonusXP}</span>
          </div>
        )}
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.text, fontWeight: 700 }}>Total XP</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.text, fontWeight: 700 }}>{totalXP}</span>
        </div>
      </div>

      {/* Growth progress */}
      <div style={{ maxWidth: 280, margin: "0 auto 20px" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, marginBottom: 6 }}>
          {stage.name} {next ? `→ ${next.name} (${next.minXP - totalXP} XP to go)` : "— Maximum growth!"}
        </p>
        {next && (
          <div style={{ height: 6, background: t.border, borderRadius: 3 }}>
            <div style={{ height: 6, background: t.accent, borderRadius: 3,
              width: `${Math.min(100, ((totalXP - stage.minXP) / (next.minXP - stage.minXP)) * 100)}%` }} />
          </div>
        )}
      </div>

      {/* Cycle progress toward evolution */}
      {!justEvolved && (
        <div style={{ maxWidth: 280, margin: "0 auto 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <CycleProgressRing currentCyclePhases={currentCyclePhases} phase={phase} size={60} />
            <div style={{ textAlign: "left" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: t.text, margin: 0 }}>
                Cycle Evolution
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: "2px 0 0" }}>
                {phasesComplete === 4
                  ? "All phases complete! Evolution incoming."
                  : `${phasesComplete} of 4 phases toward evolution`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {PHASE_KEYS.map(pk => (
              <span key={pk} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                padding: "2px 8px", borderRadius: 8,
                background: currentCyclePhases[pk] ? PHASES[pk].accent : PHASES[pk].border,
                color: currentCyclePhases[pk] ? "#fff" : PHASES[pk].muted,
                fontWeight: currentCyclePhases[pk] ? 600 : 400 }}>
                {PHASES[pk].label.slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      )}

      <button onClick={onDone} style={{ width: "100%", maxWidth: 280, padding: "14px", background: t.accent,
        color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif" }}>
        Done
      </button>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function BloomApp() {
  useFontLink();

  const [state, dispatch] = useReducer(appReducer, null, loadPersistedState);
  const [phase, setPhase] = useState(() => calculatePhase(state.cycleStartDate) || "menstrual");
  const [screen, setScreen] = useState("browse");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [lastBaseXP, setLastBaseXP] = useState(0);
  const [lastBonusXP, setLastBonusXP] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [justEvolved, setJustEvolved] = useState(false);

  // Track previous phase for cycle rollover detection
  const prevPhaseRef = useRef(phase);

  // Persist state on every change
  useEffect(() => { persistState(state); }, [state]);

  // Auto-calculate phase from cycle start date
  useEffect(() => {
    if (state.cycleStartDate) {
      const calculated = calculatePhase(state.cycleStartDate);
      if (calculated) setPhase(calculated);
    }
  }, [state.cycleStartDate]);

  // Cycle rollover detection: when phase changes from luteal to menstrual
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (prev === "luteal" && phase === "menstrual") {
      // Cycle rolled over — check for evolution
      const allComplete = Object.values(state.currentCyclePhases).every(Boolean);
      if (allComplete) {
        dispatch({ type: "EVOLVE_CREATURE" });
        // Evolution will be shown on next workout completion or browse
      } else {
        dispatch({ type: "RESET_CYCLE_PHASES" });
      }
    }
  }, [phase]);

  const t = PHASES[phase];
  const stage = getBloomStage(state.totalXP);
  const streakBonus = state.streak >= 3;

  // Workout selection
  function handleSelectWorkout(workout) {
    setSelectedWorkout(workout);
    setScreen("preview");
  }

  function handleStartWorkout() {
    setScreen("active");
  }

  function handleCompleteWorkout(baseXP, bonusXP) {
    const totalEarned = baseXP + bonusXP;
    setLastBaseXP(baseXP);
    setLastBonusXP(bonusXP);

    // Check if this completion triggers a cycle evolution
    const updatedPhases = { ...state.currentCyclePhases, [phase]: true };
    const willEvolve = Object.values(updatedPhases).every(Boolean);

    dispatch({ type: "COMPLETE_WORKOUT", workoutId: selectedWorkout.id, xp: totalEarned, phase });

    if (willEvolve) {
      dispatch({ type: "EVOLVE_CREATURE" });
      setJustEvolved(true);
    } else {
      setJustEvolved(false);
    }

    setScreen("complete");
  }

  function handleQuitWorkout() {
    dispatch({ type: "QUIT_WORKOUT" });
    setSelectedWorkout(null);
    setScreen("browse");
  }

  function handleDone() {
    setSelectedWorkout(null);
    setJustEvolved(false);
    setScreen("browse");
  }

  function handleSetCycleStart(date) {
    dispatch({ type: "SET_CYCLE_START", date });
  }

  // Check workout unlock status
  function isUnlocked(workout) {
    if (!workout.unlockReq) return true;
    const { phase: reqPhase, workoutsNeeded } = workout.unlockReq;
    return state.completedByPhase[reqPhase] >= workoutsNeeded;
  }

  // ─── BROWSE SCREEN ──────────────────────────────────────────────────────

  if (screen === "browse") {
    const workouts = WORKOUTS[phase] || [];
    const phasesComplete = Object.values(state.currentCyclePhases).filter(Boolean).length;

    return (
      <PhaseVars phase={phase}>
        <div style={{ maxWidth: 430, margin: "0 auto", padding: 20, background: t.bgGrad, minHeight: "100vh" }}>
          <style>{`
            @keyframes bloom-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
            @keyframes bloom-wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
            @keyframes bloom-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
            @keyframes bloom-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
            @keyframes bloom-shimmer { 0%,100% { opacity: 0.9; } 50% { opacity: 0.6; } }
            @keyframes bloom-orbit { 0% { transform: rotate(0deg) translateX(50px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); } }
          `}</style>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: t.text, margin: 0 }}>Bloom</h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.muted, margin: "2px 0 0" }}>
                {stage.name} · {state.totalXP} XP · {state.streak > 0 ? `${state.streak} day streak` : "Start your streak"}
              </p>
            </div>
            <button onClick={() => setShowSettings(true)} aria-label="Safety settings" style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 12px",
              fontSize: 18, cursor: "pointer" }}>
              ⚙️
            </button>
          </div>

          {/* Creature + cycle progress */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <BloomCreature phase={phase} mood="idle" size={120} stage={stage.name} evolutions={state.cycleEvolutions} />
            {state.cycleStartDate && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <CycleProgressRing currentCyclePhases={state.currentCyclePhases} phase={phase} size={50} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, margin: 0, textAlign: "left" }}>
                  {phasesComplete === 4
                    ? "All phases complete!"
                    : phasesComplete === 3
                    ? "One more phase to evolve!"
                    : `${phasesComplete}/4 phases toward evolution`}
                  {state.cycleEvolutions > 0 && (
                    <span style={{ display: "block", fontSize: 11, color: t.accent, marginTop: 2 }}>
                      Evolution {state.cycleEvolutions}: {getEvolutionTier(state.cycleEvolutions)?.name}
                    </span>
                  )}
                </p>
              </div>
            )}
            {!state.cycleStartDate && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.muted, marginTop: 8, cursor: "pointer" }}
                onClick={() => setShowSettings(true)}>
                Set your cycle date in settings to track evolution →
              </p>
            )}
          </div>

          {/* Phase selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "center" }}>
            {PHASE_KEYS.map(pk => (
              <button key={pk} onClick={() => !state.cycleStartDate && setPhase(pk)}
                disabled={!!state.cycleStartDate}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${phase === pk ? PHASES[pk].accent : PHASES[pk].border}`,
                  background: phase === pk ? PHASES[pk].accent : PHASES[pk].surface,
                  color: phase === pk ? "#fff" : PHASES[pk].muted,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: phase === pk ? 600 : 400,
                  cursor: state.cycleStartDate ? "default" : "pointer",
                  opacity: state.cycleStartDate && phase !== pk ? 0.5 : 1
                }}>
                {PHASES[pk].label.slice(0, 4)}
              </button>
            ))}
          </div>

          {/* Workout cards */}
          {workouts.map(w => {
            const locked = !isUnlocked(w);
            const completed = state.completedIds.includes(w.id);
            const hasConflict = state.modifiers.lowImpactOnly && w.exercises.some(e => e.impact === "high" && e.type !== "rest");

            return (
              <button key={w.id} onClick={() => !locked && handleSelectWorkout(w)}
                disabled={locked}
                aria-label={`${w.title}${locked ? " (locked)" : ""}${completed ? " (completed)" : ""}`}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                  padding: 16, marginBottom: 10, background: locked ? t.border : t.surface,
                  border: `1px solid ${locked ? t.border : completed ? t.accent : t.border}`,
                  borderRadius: 16, cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked ? 0.5 : 1, transition: "all 0.2s",
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                <span style={{ fontSize: 28 }}>{locked ? "🔒" : w.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>
                    {w.title}
                    {completed && <span style={{ color: t.accent, marginLeft: 6, fontSize: 13 }}>✓</span>}
                  </p>
                  <p style={{ fontSize: 13, color: t.muted, margin: "2px 0 0" }}>{w.subtitle}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: t.muted }}>{w.duration}</span>
                    <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>+{w.xp} XP</span>
                    {hasConflict && (
                      <span style={{ fontSize: 11, color: "#7A6200", background: "#FFFBE6", padding: "1px 6px",
                        borderRadius: 4 }}>⚠ modifier</span>
                    )}
                  </div>
                </div>
                <div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ display: "block", width: 16, height: 3, borderRadius: 1.5, marginBottom: 2,
                      background: i < w.difficulty ? t.accent : t.border }} />
                  ))}
                </div>
              </button>
            );
          })}

          {/* Medical disclaimer */}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: t.muted, marginTop: 24, textAlign: "center", lineHeight: 1.4 }}>
            Not medical advice. Cycle phases are estimates. Consult a healthcare provider for personalized guidance.
          </p>

          {/* Settings drawer */}
          {showSettings && (
            <SettingsDrawer
              modifiers={state.modifiers}
              onSetModifier={(key, value) => dispatch({ type: "SET_MODIFIER", key, value })}
              phase={phase}
              cycleStartDate={state.cycleStartDate}
              onSetCycleStart={handleSetCycleStart}
              cycleEvolutions={state.cycleEvolutions}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </PhaseVars>
    );
  }

  // ─── PREVIEW SCREEN ─────────────────────────────────────────────────────

  if (screen === "preview" && selectedWorkout) {
    return (
      <PhaseVars phase={phase}>
        <WorkoutPreview
          workout={selectedWorkout} phase={phase} modifiers={state.modifiers}
          onStart={handleStartWorkout} onBack={() => { setSelectedWorkout(null); setScreen("browse"); }}
        />
      </PhaseVars>
    );
  }

  // ─── ACTIVE SCREEN ──────────────────────────────────────────────────────

  if (screen === "active" && selectedWorkout) {
    return (
      <PhaseVars phase={phase}>
        <ActiveWorkout
          workout={selectedWorkout} phase={phase} modifiers={state.modifiers}
          onComplete={handleCompleteWorkout} onQuit={handleQuitWorkout}
          streakBonus={streakBonus}
        />
      </PhaseVars>
    );
  }

  // ─── COMPLETE SCREEN ────────────────────────────────────────────────────

  if (screen === "complete" && selectedWorkout) {
    return (
      <PhaseVars phase={phase}>
        <WorkoutComplete
          workout={selectedWorkout} phase={phase}
          baseXP={lastBaseXP} bonusXP={lastBonusXP} totalXP={state.totalXP}
          cycleEvolutions={state.cycleEvolutions} currentCyclePhases={state.currentCyclePhases}
          justEvolved={justEvolved}
          onDone={handleDone}
        />
      </PhaseVars>
    );
  }

  // Fallback
  return null;
}
