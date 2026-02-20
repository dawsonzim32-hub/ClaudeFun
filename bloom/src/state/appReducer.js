import { useReducer, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════════
// Persistence — saves progress to localStorage
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "bloom-app-state";

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        totalXP: state.totalXP,
        streak: state.streak,
        completedIds: state.completedIds,
        completedByPhase: state.completedByPhase,
        modifiers: state.modifiers,
        hasOnboarded: state.hasOnboarded,
      })
    );
  } catch {
    /* quota exceeded etc */
  }
}

// ═══════════════════════════════════════════════════════════
// Reducer — all state changes happen here (atomic updates)
// ═══════════════════════════════════════════════════════════

export const DEFAULT_STATE = {
  totalXP: 0,
  streak: 0,
  completedIds: [],
  completedByPhase: {
    menstrual: 0,
    follicular: 0,
    ovulatory: 0,
    luteal: 0,
  },
  modifiers: { lowImpactOnly: false, noFloorWork: false },
  hasOnboarded: false,
};

function appReducer(state, action) {
  switch (action.type) {
    case "COMPLETE_WORKOUT": {
      const { workoutId, phase, baseXP, bonusXP } = action;
      const already = state.completedIds.includes(workoutId);
      return {
        ...state,
        totalXP: state.totalXP + baseXP + bonusXP,
        streak: state.streak + 1,
        completedIds: already
          ? state.completedIds
          : [...state.completedIds, workoutId],
        completedByPhase: already
          ? state.completedByPhase
          : {
              ...state.completedByPhase,
              [phase]: state.completedByPhase[phase] + 1,
            },
      };
    }
    case "QUIT_WORKOUT":
      return { ...state, streak: 0 };
    case "SET_MODIFIER":
      return {
        ...state,
        modifiers: { ...state.modifiers, [action.key]: action.value },
      };
    case "COMPLETE_ONBOARDING":
      return { ...state, hasOnboarded: true };
    default:
      return state;
  }
}

// Custom hook that auto-persists state on every change
export function usePersistedReducer() {
  const saved = useMemo(() => loadPersistedState(), []);
  const [state, dispatch] = useReducer(appReducer, saved || DEFAULT_STATE);

  useEffect(() => {
    persistState(state);
  }, [state]);

  return [state, dispatch];
}
