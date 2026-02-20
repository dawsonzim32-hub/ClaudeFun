import { PHASES } from "../data/phases.js";
import { SUBSTITUTIONS } from "../data/substitutions.js";
import PhaseVars from "./PhaseVars.jsx";
import BloomCreature from "./BloomCreature.jsx";

// Workout detail/preview — shows exercises, badges, and start button
export default function WorkoutPreview({
  workout,
  phase,
  onStart,
  onBack,
  modifiers,
}) {
  const t = PHASES[phase];
  const realEx = workout.exercises.filter((e) => e.type !== "rest");
  const totalSec = workout.exercises.reduce((s, e) => s + e.duration, 0);
  const mins = Math.ceil(totalSec / 60);
  const hasHigh = workout.exercises.some((e) => e.impact === "high");
  const needsFloor = workout.exercises.some((e) => e.floorRequired);
  const highImpactExercises = workout.exercises.filter(
    (e) => e.impact === "high" && SUBSTITUTIONS[e.name]
  );
  const impactConflict = modifiers.lowImpactOnly && hasHigh;
  const floorConflict = modifiers.noFloorWork && needsFloor;

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
        <div style={{ padding: "16px 20px 0" }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: t.muted,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'DM Sans'",
              padding: "8px 0",
            }}
          >
            \u2190 Back
          </button>
        </div>
        <div style={{ padding: "16px 24px 120px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{workout.icon}</div>
            <h1
              style={{
                color: t.text,
                fontSize: 30,
                fontFamily: "'Cormorant Garamond',serif",
                fontWeight: 600,
                margin: "0 0 6px",
              }}
            >
              {workout.title}
            </h1>
            <p style={{ color: t.muted, fontSize: 14, margin: "0 0 16px" }}>
              {workout.subtitle}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
              }}
            >
              {[
                { l: "Duration", v: `${mins} min` },
                { l: "Exercises", v: realEx.length },
                { l: "XP", v: `+${workout.xp}` },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      color: t.accent,
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {s.v}
                  </div>
                  <div style={{ color: t.muted, fontSize: 11 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Context badges */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            {hasHigh && (
              <span
                style={{
                  background: "rgba(255,100,100,0.1)",
                  border: "1px solid rgba(255,100,100,0.2)",
                  color: "#ff8a8a",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                \u26A1 Has high-impact moves
              </span>
            )}
            {needsFloor && (
              <span
                style={{
                  background: `${t.accent}10`,
                  border: `1px solid ${t.accent}20`,
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                \uD83E\uDDCE Floor work needed
              </span>
            )}
            {!hasHigh && (
              <span
                style={{
                  background: `${t.accent}10`,
                  border: `1px solid ${t.accent}20`,
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                \uD83E\uDD2B Apartment-friendly
              </span>
            )}
          </div>

          {/* Modifier warnings */}
          {(impactConflict || floorConflict) && (
            <div
              style={{
                background: "rgba(255,180,80,0.1)",
                border: "1px solid rgba(255,180,80,0.25)",
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: "#ffb850",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                \u26A0 Modifier Heads-Up
              </div>
              {impactConflict && (
                <p
                  style={{
                    color: t.text,
                    fontSize: 12,
                    margin: "0 0 4px",
                    lineHeight: 1.4,
                  }}
                >
                  This workout has high-impact moves. Substitution tips will
                  appear during each one.
                </p>
              )}
              {floorConflict && (
                <p
                  style={{
                    color: t.text,
                    fontSize: 12,
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  This workout includes floor exercises. Some can be done
                  standing with modifications.
                </p>
              )}
            </div>
          )}

          {/* Substitution previews */}
          {impactConflict && highImpactExercises.length > 0 && (
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                LOW-IMPACT SWAPS AVAILABLE
              </div>
              {highImpactExercises.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom:
                      i < highImpactExercises.length - 1 ? 6 : 0,
                  }}
                >
                  <span
                    style={{
                      color: t.muted,
                      fontSize: 12,
                      textDecoration: "line-through",
                    }}
                  >
                    {ex.name}
                  </span>
                  <span style={{ color: t.muted, fontSize: 11 }}>
                    \u2192
                  </span>
                  <span style={{ color: t.text, fontSize: 12 }}>
                    {SUBSTITUTIONS[ex.name]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Bloom creature + warmup note */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 18,
              padding: "20px 18px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <BloomCreature phase={phase} mood="idle" size={80} stage={2} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                {t.emoji} {t.name.toUpperCase()}
              </div>
              <p
                style={{
                  color: t.text,
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: "'Cormorant Garamond',serif",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                {workout.warmupNote}
              </p>
            </div>
          </div>

          {/* Intensity meter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
              padding: "0 4px",
            }}
          >
            <span style={{ color: t.muted, fontSize: 12 }}>Intensity</span>
            <div style={{ display: "flex", gap: 3, flex: 1 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background:
                      i < workout.difficulty ? t.accent : `${t.accent}15`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Exercise list */}
          <h3
            style={{
              color: t.text,
              fontSize: 16,
              fontWeight: 600,
              margin: "0 0 12px",
            }}
          >
            Exercise Breakdown
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {workout.exercises.map((ex, i) => {
              const sub = SUBSTITUTIONS[ex.name];
              const flagged =
                (modifiers.lowImpactOnly && ex.impact === "high") ||
                (modifiers.noFloorWork && ex.floorRequired);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background:
                      ex.type === "rest"
                        ? "transparent"
                        : flagged
                        ? "rgba(255,180,80,0.08)"
                        : t.surface,
                    border:
                      ex.type === "rest"
                        ? "none"
                        : `1px solid ${
                            flagged ? "rgba(255,180,80,0.2)" : t.border
                          }`,
                    borderRadius: 12,
                    opacity: ex.type === "rest" ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: ex.type === "rest" ? 12 : 16,
                    }}
                  >
                    {ex.type === "rest" ? "\u2014" : ex.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: ex.type === "rest" ? t.muted : t.text,
                        fontSize: 13,
                        fontWeight: ex.type === "rest" ? 400 : 600,
                      }}
                    >
                      {ex.name}
                      {ex.reps && (
                        <span
                          style={{
                            color: t.accent,
                            fontWeight: 700,
                            marginLeft: 6,
                            fontSize: 12,
                          }}
                        >
                          {ex.reps}
                        </span>
                      )}
                    </div>
                    {ex.type !== "rest" && ex.muscleGroup && (
                      <div style={{ color: t.muted, fontSize: 11 }}>
                        {ex.muscleGroup}
                      </div>
                    )}
                    {flagged && sub && (
                      <div
                        style={{
                          color: "#ffb850",
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        Swap: {sub}
                      </div>
                    )}
                    {flagged && ex.floorRequired && !sub && (
                      <div
                        style={{
                          color: "#ffb850",
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        Requires floor space
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      color: t.muted,
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {ex.duration}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky start button */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 24px calc(32px + env(safe-area-inset-bottom))",
            background: `linear-gradient(to top,${t.bg} 60%,transparent)`,
          }}
        >
          <button
            onClick={onStart}
            style={{
              width: "100%",
              maxWidth: 430,
              margin: "0 auto",
              display: "block",
              padding: "18px 0",
              background: `linear-gradient(135deg,${t.accent} 0%,${t.accentDark} 100%)`,
              border: "none",
              borderRadius: 16,
              color: t.bg,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "'DM Sans'",
              cursor: "pointer",
              boxShadow: `0 6px 30px ${t.accent}40`,
            }}
          >
            Start Workout \u2726
          </button>
        </div>
      </div>
    </PhaseVars>
  );
}
