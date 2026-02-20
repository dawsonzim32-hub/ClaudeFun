import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PHASES } from "../data/phases.js";
import { SUBSTITUTIONS } from "../data/substitutions.js";
import { useOverlay } from "../hooks/useOverlay.js";
import PhaseVars from "./PhaseVars.jsx";
import BloomCreature from "./BloomCreature.jsx";
import CircularTimer from "./CircularTimer.jsx";
import PauseOverlay from "./PauseOverlay.jsx";

// The main workout screen — timer, exercise cues, Bloom companion
export default function ActiveWorkout({
  workout,
  phase,
  onComplete,
  onQuit,
  streakBonus,
  modifiers,
}) {
  const t = PHASES[phase];
  const hasExercises = workout.exercises?.length > 0;

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(
    hasExercises ? workout.exercises[0].duration : 0
  );
  const [isPaused, setIsPaused] = useState(false);
  const [bloomMood, setBloomMood] = useState("working");
  const [xpDisplay, setXpDisplay] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const closeQuitConfirm = useCallback(() => setShowQuitConfirm(false), []);
  const quitOverlayRef = useOverlay(showQuitConfirm, closeQuitConfirm);
  const advancingRef = useRef(false);
  const xpRef = useRef(0);
  const timerRef = useRef(null);

  const ex = hasExercises ? workout.exercises[exerciseIdx] : null;
  const total = workout.exercises?.length || 0;
  const progress = total <= 1 ? 1 : exerciseIdx / (total - 1);

  // Deterministic XP distribution (floor + remainder, no drift)
  const realExercises = useMemo(
    () => workout.exercises.filter((e) => e.type !== "rest"),
    [workout.exercises]
  );

  const xpForExercise = useCallback(
    (exercise) => {
      if (exercise.type === "rest") return 0;
      const count = realExercises.length;
      if (count === 0) return 0;
      const base = Math.floor(workout.xp / count);
      const remainder = workout.xp % count;
      const realIdx = realExercises.indexOf(exercise);
      return base + (realIdx < remainder ? 1 : 0);
    },
    [workout.xp, realExercises]
  );

  const advance = useCallback(() => {
    const earned = xpForExercise(ex);
    xpRef.current += earned;
    setXpDisplay(xpRef.current);

    if (exerciseIdx < total - 1) {
      const next = exerciseIdx + 1;
      setExerciseIdx(next);
      setTimeLeft(workout.exercises[next].duration);
    } else {
      const baseXP = xpRef.current;
      const bonusXP = streakBonus ? Math.round(baseXP * 0.1) : 0;
      onComplete(baseXP, bonusXP);
    }
  }, [exerciseIdx, ex, total, workout, xpForExercise, onComplete, streakBonus]);

  // Timer interval — clears on pause
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [exerciseIdx, isPaused]);

  // Auto-advance when timer hits zero
  useEffect(() => {
    if (timeLeft !== 0) return;
    if (advancingRef.current) return;
    advancingRef.current = true;
    advance();
  }, [timeLeft, advance]);

  // Release advance lock when exercise changes
  useEffect(() => {
    advancingRef.current = false;
  }, [exerciseIdx]);

  // Bloom mood matches exercise type
  useEffect(() => {
    if (!ex) return;
    if (ex.type === "rest") setBloomMood("resting");
    else if (ex.type === "cardio") setBloomMood("cheering");
    else setBloomMood("working");
  }, [ex?.type]);

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (!advancingRef.current) {
      advancingRef.current = true;
      advance();
    }
  };

  const handleExtendRest = () => setTimeLeft((prev) => prev + 15);

  // Empty exercise guard
  if (!hasExercises || !ex) {
    return (
      <PhaseVars phase={phase}>
        <div
          style={{
            minHeight: "100vh",
            background: t.bgGrad,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans',sans-serif",
            maxWidth: 430,
            margin: "0 auto",
          }}
        >
          <p style={{ color: t.text, fontSize: 16, marginBottom: 16 }}>
            This workout has no exercises.
          </p>
          <button
            onClick={onQuit}
            style={{
              padding: "12px 32px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              color: t.text,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'DM Sans'",
            }}
          >
            \u2190 Back
          </button>
        </div>
      </PhaseVars>
    );
  }

  const tc = {
    strength: { bg: `${t.accent}20`, label: "STRENGTH", color: t.accent },
    cardio: {
      bg: "rgba(255,100,100,0.15)",
      label: "CARDIO",
      color: "#ff8a8a",
    },
    hold: {
      bg: "rgba(100,180,255,0.15)",
      label: "HOLD",
      color: "#8ac4ff",
    },
    flow: {
      bg: "rgba(180,140,255,0.15)",
      label: "FLOW",
      color: "#b88cff",
    },
    rest: {
      bg: "rgba(255,255,255,0.05)",
      label: "REST",
      color: t.muted,
    },
  }[ex.type] || { bg: `${t.accent}20`, label: "MOVE", color: t.accent };

  const isRest = ex?.type === "rest";
  const sub = ex ? SUBSTITUTIONS[ex.name] : null;
  const showSub = modifiers?.lowImpactOnly && sub;
  const displayName = showSub ? sub : ex?.name;
  const displayCue = showSub ? `${ex.cue} (Modified: ${sub})` : ex?.cue;

  return (
    <PhaseVars phase={phase}>
      <div
        style={{
          minHeight: "100vh",
          background: t.bgGrad,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans',sans-serif",
          maxWidth: 430,
          margin: "0 auto",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {isPaused && (
          <PauseOverlay phase={phase} onResume={() => setIsPaused(false)} />
        )}

        {/* Quit confirmation */}
        {showQuitConfirm && (
          <div
            ref={quitOverlayRef}
            role="dialog"
            aria-label="Quit workout confirmation"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 950,
              background: `${t.bg}ee`,
              backdropFilter: "blur(16px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              animation: "bloom-fade-in 0.2s ease",
              padding: 24,
            }}
          >
            <BloomCreature phase={phase} mood="resting" size={100} stage={2} />
            <p
              style={{
                color: t.text,
                fontSize: 20,
                fontWeight: 600,
                fontFamily: "'Cormorant Garamond',serif",
                margin: "12px 0 4px",
              }}
            >
              Leave workout?
            </p>
            <p
              style={{
                color: t.muted,
                fontSize: 13,
                textAlign: "center",
                margin: "0 0 24px",
                maxWidth: 260,
              }}
            >
              Your progress won't be saved and your streak will reset.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                width: "100%",
                maxWidth: 280,
              }}
            >
              <button
                onClick={() => setShowQuitConfirm(false)}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  color: t.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans'",
                }}
              >
                Keep Going
              </button>
              <button
                onClick={onQuit}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: "rgba(255,100,100,0.15)",
                  border: "1px solid rgba(255,100,100,0.25)",
                  borderRadius: 12,
                  color: "#ff8a8a",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans'",
                }}
              >
                Quit
              </button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setShowQuitConfirm(true)}
            aria-label="Quit workout"
            style={{
              background: "none",
              border: "none",
              color: t.muted,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans'",
            }}
          >
            \u2715 Quit
          </button>
          <div style={{ color: t.muted, fontSize: 12, fontWeight: 600 }}>
            {exerciseIdx + 1} / {total}
          </div>
          <div style={{ color: t.accent, fontSize: 13, fontWeight: 700 }}>
            +{xpDisplay} XP
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: "0 20px", marginBottom: 8 }}>
          <div
            style={{
              height: 3,
              background: `${t.accent}15`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: t.accent,
                borderRadius: 2,
                width: `${progress * 100}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "0 24px",
          }}
        >
          {/* Exercise type badge */}
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span
              style={{
                background: tc.bg,
                color: tc.color,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: "4px 12px",
                borderRadius: 20,
              }}
            >
              {tc.label}
            </span>
            {ex.muscleGroup && (
              <span style={{ color: t.muted, fontSize: 11, marginLeft: 8 }}>
                \u00B7 {ex.muscleGroup}
              </span>
            )}
            {ex.impact === "high" && (
              <span
                style={{ color: "#ff8a8a", fontSize: 10, marginLeft: 6 }}
              >
                \u26A1high impact
              </span>
            )}
          </div>

          {/* Exercise name */}
          <h1
            style={{
              color: t.text,
              fontSize: 26,
              fontWeight: 600,
              fontFamily: "'Cormorant Garamond',serif",
              textAlign: "center",
              margin: "0 0 4px",
              lineHeight: 1.2,
            }}
          >
            <span style={{ fontSize: 28, marginRight: 8 }}>{ex.icon}</span>
            {displayName}
          </h1>
          {ex.reps && (
            <div
              style={{
                textAlign: "center",
                color: t.accent,
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {ex.reps}
            </div>
          )}
          {showSub && (
            <div
              style={{
                textAlign: "center",
                color: t.muted,
                fontSize: 11,
                fontStyle: "italic",
                marginBottom: 4,
              }}
            >
              Replacing: {ex.name}
            </div>
          )}

          {/* Timer + Bloom creature */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 0,
            }}
          >
            <div style={{ position: "relative" }}>
              <CircularTimer
                timeLeft={timeLeft}
                totalTime={ex.duration}
                phase={phase}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <BloomCreature
                  phase={phase}
                  mood={bloomMood}
                  size={75}
                  stage={2}
                />
              </div>
            </div>
          </div>

          {/* Coaching cue */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              padding: "14px 18px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                color: t.text,
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: "italic",
                margin: 0,
                textAlign: "center",
              }}
            >
              "{displayCue}"
            </p>
          </div>

          {/* Up next preview */}
          {exerciseIdx < total - 1 &&
            (() => {
              const nextEx = workout.exercises[exerciseIdx + 1];
              const nextSub = SUBSTITUTIONS[nextEx.name];
              const nextName =
                modifiers?.lowImpactOnly && nextSub ? nextSub : nextEx.name;
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: t.muted, fontSize: 11 }}>NEXT</span>
                  <span
                    style={{ color: t.text, fontSize: 13, fontWeight: 600 }}
                  >
                    {nextEx.icon} {nextName}
                  </span>
                </div>
              );
            })()}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, paddingBottom: 32 }}>
            {isRest ? (
              <>
                <button
                  onClick={handleExtendRest}
                  style={{
                    flex: 1,
                    padding: "16px 0",
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 14,
                    color: t.text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans'",
                  }}
                >
                  +15s
                </button>
                <button
                  onClick={handleSkip}
                  style={{
                    flex: 2,
                    padding: "16px 0",
                    background: `linear-gradient(135deg,${t.accent} 0%,${t.accentDark} 100%)`,
                    border: "none",
                    borderRadius: 14,
                    color: t.bg,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'DM Sans'",
                  }}
                >
                  Skip Rest \u2192
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsPaused(true)}
                  style={{
                    flex: 1,
                    padding: "16px 0",
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 14,
                    color: t.text,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans'",
                  }}
                >
                  \u23F8 Pause
                </button>
                <button
                  onClick={handleSkip}
                  style={{
                    flex: 1,
                    padding: "16px 0",
                    background: `linear-gradient(135deg,${t.accent} 0%,${t.accentDark} 100%)`,
                    border: "none",
                    borderRadius: 14,
                    color: t.bg,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'DM Sans'",
                  }}
                >
                  {exerciseIdx < total - 1 ? "Skip \u2192" : "Finish \u2726"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </PhaseVars>
  );
}
