import { useMemo } from "react";
import { PHASES } from "../data/phases.js";
import { getBloomStage, getNextStage } from "../data/bloom-stages.js";
import PhaseVars from "./PhaseVars.jsx";
import BloomCreature from "./BloomCreature.jsx";

// Celebration screen after finishing a workout
export default function WorkoutComplete({
  workout,
  phase,
  baseXP,
  bonusXP,
  totalXP,
  onDone,
}) {
  const t = PHASES[phase];
  const stage = getBloomStage(totalXP);
  const nextStg = getNextStage(totalXP);

  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: 8 + i * 6.5,
        top: 8 + Math.random() * 22,
        size: 4 + Math.random() * 4,
        round: i % 2 === 0,
        colorIdx: i % 3,
        delay: i * 0.08,
        dur: 1.8 + Math.random() * 0.8,
      })),
    []
  );
  const colors = [t.accent, t.text, t.muted];
  const totalEarned = baseXP + bonusXP;

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
          padding: 24,
          textAlign: "center",
          maxWidth: 430,
          margin: "0 auto",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Confetti */}
        {confetti.map((c, i) => (
          <div
            key={i}
            style={{
              position: "fixed",
              left: `${c.left}%`,
              top: `${c.top}%`,
              width: c.size,
              height: c.size,
              borderRadius: c.round ? "50%" : "1px",
              background: colors[c.colorIdx],
              animation: `bloom-confetti ${c.dur}s ease-out ${c.delay}s forwards`,
              opacity: 0.8,
            }}
          />
        ))}

        <div style={{ animation: "bloom-scale-in 0.6s ease-out" }}>
          <BloomCreature
            phase={phase}
            mood="celebrating"
            size={180}
            stage={stage.index}
          />
        </div>

        <h1
          style={{
            color: t.text,
            fontSize: 32,
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 600,
            margin: "12px 0 6px",
            animation: "bloom-fade-up 0.5s ease-out 0.3s both",
          }}
        >
          You're Incredible.
        </h1>
        <p
          style={{
            color: t.muted,
            fontSize: 14,
            margin: "0 0 24px",
            animation: "bloom-fade-up 0.5s ease-out 0.5s both",
          }}
        >
          {workout.title} \u2014 Complete
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            width: "100%",
            maxWidth: 340,
            animation: "bloom-fade-up 0.5s ease-out 0.6s both",
          }}
        >
          {[
            { label: "Base XP", value: `+${baseXP}`, icon: "\u2726" },
            { label: "Duration", value: workout.duration, icon: "\u23F1" },
            { label: "Phase", value: t.label, icon: t.emoji },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "14px 8px",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div
                style={{ color: t.accent, fontSize: 18, fontWeight: 700 }}
              >
                {s.value}
              </div>
              <div style={{ color: t.muted, fontSize: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Streak bonus */}
        {bonusXP > 0 && (
          <div
            style={{
              background: `${t.accent}15`,
              borderRadius: 12,
              padding: "8px 16px",
              marginBottom: 8,
              animation: "bloom-fade-up 0.5s ease-out 0.7s both",
            }}
          >
            <span
              style={{ color: t.accent, fontSize: 13, fontWeight: 700 }}
            >
              \uD83D\uDD25 Streak Bonus: +{bonusXP} XP
            </span>
          </div>
        )}

        {/* Total */}
        <div
          style={{
            color: t.text,
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 20,
            animation: "bloom-fade-up 0.5s ease-out 0.75s both",
          }}
        >
          Total: +{totalEarned} XP
        </div>

        {/* Bloom growth progress */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 24,
            maxWidth: 340,
            width: "100%",
            animation: "bloom-fade-up 0.5s ease-out 0.8s both",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{ color: t.text, fontSize: 14, fontWeight: 600 }}
            >
              {stage.icon} {stage.name}
            </span>
            {nextStg && (
              <span style={{ color: t.muted, fontSize: 11 }}>
                {nextStg.minXP - totalXP} XP to {nextStg.name}
              </span>
            )}
          </div>
          {nextStg && (
            <div
              style={{
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
                  transition: "width 1s ease",
                }}
              />
            </div>
          )}
        </div>

        <button
          onClick={onDone}
          style={{
            width: "100%",
            maxWidth: 340,
            padding: "18px 0",
            background: `linear-gradient(135deg,${t.accent} 0%,${t.accentDark} 100%)`,
            border: "none",
            borderRadius: 16,
            color: t.bg,
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'DM Sans'",
            boxShadow: `0 6px 30px ${t.accent}40`,
            animation: "bloom-fade-up 0.5s ease-out 1s both",
          }}
        >
          Return to Garden \u2726
        </button>
      </div>
    </PhaseVars>
  );
}
