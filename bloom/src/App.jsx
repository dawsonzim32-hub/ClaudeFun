import { useState, useCallback } from "react";
import { PHASES, PHASE_SCIENCE } from "./data/phases.js";
import { WORKOUTS } from "./data/workouts.js";
import { getBloomStage, getNextStage } from "./data/bloom-stages.js";
import { usePersistedReducer } from "./state/appReducer.js";
import PhaseVars from "./components/PhaseVars.jsx";
import BloomCreature from "./components/BloomCreature.jsx";
import ActiveWorkout from "./components/ActiveWorkout.jsx";
import WorkoutComplete from "./components/WorkoutComplete.jsx";
import WorkoutPreview from "./components/WorkoutPreview.jsx";
import SettingsDrawer from "./components/SettingsDrawer.jsx";
import Onboarding from "./components/Onboarding.jsx";

// ═══════════════════════════════════════════════════════════
// BLOOM — Main App
// ═══════════════════════════════════════════════════════════

export default function BloomApp() {
  const [state, dispatch] = usePersistedReducer();
  const {
    totalXP,
    streak,
    completedIds,
    completedByPhase,
    modifiers,
    hasOnboarded,
  } = state;

  const [phase, setPhase] = useState("follicular");
  const [screen, setScreen] = useState("browse");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [lastBaseXP, setLastBaseXP] = useState(0);
  const [lastBonusXP, setLastBonusXP] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const t = PHASES[phase];
  const workouts = WORKOUTS[phase] || [];
  const stage = getBloomStage(totalXP);
  const nextStg = getNextStage(totalXP);

  const isUnlocked = (w) => {
    if (!w.unlockReq) return true;
    return completedByPhase[w.unlockReq.phase] >= w.unlockReq.workoutsNeeded;
  };

  const handleComplete = useCallback(
    (base, bonus) => {
      setLastBaseXP(base);
      setLastBonusXP(bonus);
      dispatch({
        type: "COMPLETE_WORKOUT",
        workoutId: selectedWorkout.id,
        phase,
        baseXP: base,
        bonusXP: bonus,
      });
      setScreen("complete");
    },
    [selectedWorkout, phase, dispatch]
  );

  const handleQuit = useCallback(() => {
    dispatch({ type: "QUIT_WORKOUT" });
    setScreen("browse");
    setSelectedWorkout(null);
  }, [dispatch]);

  const handleSetModifier = useCallback(
    (key, value) => {
      dispatch({ type: "SET_MODIFIER", key, value });
    },
    [dispatch]
  );

  // ─── Onboarding ───────────────────────────────────────
  if (!hasOnboarded) {
    return (
      <Onboarding
        onComplete={() => dispatch({ type: "COMPLETE_ONBOARDING" })}
        onSelectPhase={setPhase}
      />
    );
  }

  // ─── Screen routing ───────────────────────────────────
  if (screen === "preview" && selectedWorkout) {
    return (
      <WorkoutPreview
        workout={selectedWorkout}
        phase={phase}
        modifiers={modifiers}
        onStart={() => setScreen("active")}
        onBack={() => setScreen("browse")}
      />
    );
  }

  if (screen === "active" && selectedWorkout) {
    return (
      <ActiveWorkout
        workout={selectedWorkout}
        phase={phase}
        modifiers={modifiers}
        onComplete={handleComplete}
        onQuit={handleQuit}
        streakBonus={streak >= 3}
      />
    );
  }

  if (screen === "complete" && selectedWorkout) {
    return (
      <WorkoutComplete
        workout={selectedWorkout}
        phase={phase}
        baseXP={lastBaseXP}
        bonusXP={lastBonusXP}
        totalXP={totalXP}
        onDone={() => {
          setScreen("browse");
          setSelectedWorkout(null);
        }}
      />
    );
  }

  // ─── Browse (home) screen ─────────────────────────────
  return (
    <PhaseVars phase={phase}>
      <div
        style={{
          minHeight: "100vh",
          background: t.bgGrad,
          fontFamily: "'DM Sans',sans-serif",
          maxWidth: 430,
          margin: "0 auto",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {showSettings && (
          <SettingsDrawer
            modifiers={modifiers}
            onSetModifier={handleSetModifier}
            phase={phase}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Header */}
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: t.muted,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t.emoji} {t.name}
              </div>
              <div
                style={{
                  color: t.text,
                  fontSize: 20,
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                Today's Training
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <button
                onClick={() => setShowSettings(true)}
                aria-label="Safety settings"
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  color: t.muted,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                \u2699
                {(modifiers.lowImpactOnly || modifiers.noFloorWork) && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: t.accent,
                      marginLeft: 4,
                    }}
                  />
                )}
              </button>
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 11 }}>{stage.icon}</span>
                <span
                  style={{
                    color: t.accent,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {totalXP}
                </span>
              </div>
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 12 }}>\uD83D\uDD25</span>
                <span
                  style={{
                    color: t.text,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {streak}
                </span>
                {streak >= 3 && (
                  <span
                    style={{
                      color: t.accent,
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    +10%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phase selector */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "14px 20px 0",
            overflowX: "auto",
          }}
        >
          {Object.entries(PHASES).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPhase(key)}
              style={{
                background: phase === key ? t.accent : t.surface,
                border: `1px solid ${
                  phase === key ? t.accent : t.border
                }`,
                borderRadius: 20,
                padding: "7px 14px",
                color: phase === key ? t.bg : t.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans'",
                whiteSpace: "nowrap",
              }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {/* Active modifier badges */}
        {(modifiers.lowImpactOnly || modifiers.noFloorWork) && (
          <div style={{ display: "flex", gap: 6, padding: "10px 20px 0" }}>
            {modifiers.lowImpactOnly && (
              <span
                style={{
                  background: `${t.accent}15`,
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 12,
                }}
              >
                \uD83E\uDD2B Low-impact mode
              </span>
            )}
            {modifiers.noFloorWork && (
              <span
                style={{
                  background: `${t.accent}15`,
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 12,
                }}
              >
                \uD83E\uDDCD No floor work
              </span>
            )}
          </div>
        )}

        <div
          style={{
            padding: "16px 20px 40px",
            animation: "bloom-fade-in 0.3s ease",
          }}
        >
          {/* Bloom creature + philosophy */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 18,
              padding: 20,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <BloomCreature
              phase={phase}
              mood="idle"
              size={120}
              stage={stage.index}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  color: t.accent,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {stage.icon} {stage.name}
              </span>
              {nextStg && (
                <span style={{ color: t.muted, fontSize: 11 }}>
                  \u00B7 {nextStg.minXP - totalXP} XP to {nextStg.name}
                </span>
              )}
            </div>
            {nextStg && (
              <div
                style={{
                  maxWidth: 200,
                  margin: "8px auto 0",
                  height: 4,
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
                    width: `${Math.min(
                      ((totalXP - stage.minXP) /
                        (nextStg.minXP - stage.minXP)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
            <p
              style={{
                color: t.text,
                fontSize: 15,
                lineHeight: 1.6,
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: "italic",
                margin: "10px 0 0",
              }}
            >
              "{t.philosophy}"
            </p>
          </div>

          {/* Phase science */}
          <div
            style={{
              background: `${t.accent}10`,
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 12,
              borderLeft: `3px solid ${t.accent}`,
            }}
          >
            <div
              style={{
                color: t.accent,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              WHY THESE WORKOUTS?
            </div>
            <p
              style={{
                color: t.text,
                fontSize: 13,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {PHASE_SCIENCE[phase]}
            </p>
          </div>

          <p
            style={{
              color: t.muted,
              fontSize: 11,
              fontStyle: "italic",
              margin: "0 0 20px",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            General guidance, not medical advice \u2014 listen to your body and
            consult a professional as needed.
          </p>

          {/* Workout cards */}
          <h3
            style={{
              color: t.text,
              fontSize: 17,
              fontWeight: 600,
              margin: "0 0 14px",
            }}
          >
            Choose Your Workout
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {workouts.map((w) => {
              const done = completedIds.includes(w.id);
              const locked = !isUnlocked(w);
              const realEx = w.exercises.filter((e) => e.type !== "rest");
              const hasHigh = w.exercises.some((e) => e.impact === "high");
              const needsFloor = w.exercises.some(
                (e) => e.floorRequired
              );
              const flagged =
                (modifiers.lowImpactOnly && hasHigh) ||
                (modifiers.noFloorWork && needsFloor);

              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={done || locked}
                  aria-label={`${w.title} \u2014 ${w.duration}, ${w.xp} XP${
                    done ? ", completed" : ""
                  }${locked ? ", locked" : ""}`}
                  onClick={() => {
                    setSelectedWorkout(w);
                    setScreen("preview");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: done
                      ? `${t.accent}08`
                      : locked
                      ? `${t.surface}44`
                      : t.surface,
                    border: `1px solid ${
                      done ? t.accent + "30" : t.border
                    }`,
                    borderRadius: 18,
                    padding: 18,
                    cursor: done || locked ? "default" : "pointer",
                    opacity: done ? 0.6 : locked ? 0.45 : 1,
                    transition: "all 0.2s ease",
                    position: "relative",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  {done && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 14,
                        background: t.accent,
                        color: t.bg,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 10,
                      }}
                    >
                      \u2713 COMPLETE
                    </div>
                  )}
                  {locked && w.unlockReq && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 14,
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        color: t.muted,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 10,
                      }}
                    >
                      \uD83D\uDD12 Complete{" "}
                      {completedByPhase[w.unlockReq.phase]}/
                      {w.unlockReq.workoutsNeeded}{" "}
                      {PHASES[w.unlockReq.phase].label} workouts
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 32,
                        width: 52,
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `${t.accent}15`,
                        borderRadius: 14,
                      }}
                    >
                      {w.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          color: t.text,
                          fontSize: 17,
                          fontWeight: 600,
                        }}
                      >
                        {w.title}
                      </div>
                      <div
                        style={{
                          color: t.muted,
                          fontSize: 13,
                          marginTop: 2,
                        }}
                      >
                        {w.subtitle}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      color: t.muted,
                      fontSize: 12,
                      paddingTop: 10,
                      borderTop: `1px solid ${t.border}`,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>\u23F1 {w.duration}</span>
                    <span>\uD83D\uDCAA {realEx.length}</span>
                    <span
                      style={{ color: t.accent, fontWeight: 700 }}
                    >
                      +{w.xp} XP
                    </span>
                    {!hasHigh && (
                      <span style={{ opacity: 0.6 }}>
                        \uD83E\uDD2B quiet
                      </span>
                    )}
                    {flagged && (
                      <span
                        style={{ color: "#ffb850", fontSize: 10 }}
                      >
                        \u26A0 modifier conflict
                      </span>
                    )}
                    <span
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: 2,
                      }}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            width: 12,
                            height: 3,
                            borderRadius: 1,
                            background:
                              i < w.difficulty
                                ? t.accent
                                : `${t.accent}20`,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </PhaseVars>
  );
}
