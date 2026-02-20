import { useState } from "react";
import { PHASES } from "../data/phases.js";
import BloomCreature from "./BloomCreature.jsx";

// First-time onboarding flow — welcomes the user and explains the app
export default function Onboarding({ onComplete, onSelectPhase }) {
  const [step, setStep] = useState(0);
  const t = PHASES.follicular; // Use spring colors for onboarding

  const steps = [
    {
      title: "Welcome to Bloom",
      subtitle: "Workouts that move with your cycle.",
      body: "Bloom adapts your training to where you are in your menstrual cycle \u2014 so you're always working with your body, not against it.",
      creature: { mood: "idle", size: 160 },
    },
    {
      title: "Four Phases. Four Seasons.",
      subtitle: "Your body has its own rhythm.",
      body: "Each phase of your cycle changes how your body responds to exercise. Bloom matches your workouts to your biology.",
      creature: { mood: "cheering", size: 140 },
    },
    {
      title: "Meet Your Bloom",
      subtitle: "It grows as you do.",
      body: "Complete workouts to earn XP and watch your Bloom evolve from a tiny seedling into something radiant. Show up \u2014 that's all it takes.",
      creature: { mood: "celebrating", size: 160 },
    },
  ];

  const s = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bgGrad,
        fontFamily: "'DM Sans',sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        maxWidth: 430,
        margin: "0 auto",
        paddingTop: "calc(40px + env(safe-area-inset-top))",
        paddingBottom: "calc(40px + env(safe-area-inset-bottom))",
        textAlign: "center",
      }}
    >
      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? t.accent : `${t.accent}30`,
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Bloom creature */}
      <div style={{ animation: "bloom-scale-in 0.5s ease-out", marginBottom: 24 }}>
        <BloomCreature
          phase="follicular"
          mood={s.creature.mood}
          size={s.creature.size}
          stage={step}
        />
      </div>

      {/* Content */}
      <div style={{ animation: "bloom-fade-up 0.4s ease-out" }} key={step}>
        <h1
          style={{
            color: t.text,
            fontSize: 30,
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 600,
            margin: "0 0 8px",
            lineHeight: 1.2,
          }}
        >
          {s.title}
        </h1>
        <p
          style={{
            color: t.accent,
            fontSize: 15,
            fontWeight: 600,
            margin: "0 0 16px",
          }}
        >
          {s.subtitle}
        </p>
        <p
          style={{
            color: t.muted,
            fontSize: 14,
            lineHeight: 1.7,
            margin: "0 0 40px",
            maxWidth: 320,
          }}
        >
          {s.body}
        </p>
      </div>

      {/* Phase selector on last step */}
      {isLast && (
        <div style={{ width: "100%", maxWidth: 340, marginBottom: 20, animation: "bloom-fade-up 0.4s ease-out 0.2s both" }}>
          <p style={{ color: t.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Where are you right now?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(PHASES).map(([key, p]) => (
              <button
                key={key}
                onClick={() => {
                  onSelectPhase(key);
                  onComplete();
                }}
                style={{
                  padding: "14px 12px",
                  background: p.surface,
                  border: `1px solid ${p.border}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontFamily: "'DM Sans'",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                <div style={{ color: p.text, fontSize: 13, fontWeight: 600 }}>
                  {p.label}
                </div>
                <div style={{ color: p.muted, fontSize: 11 }}>{p.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {!isLast && (
        <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 340 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
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
              Back
            </button>
          )}
          <button
            onClick={() => setStep(step + 1)}
            style={{
              flex: 2,
              padding: "16px 0",
              background: `linear-gradient(135deg,${t.accent} 0%,${t.accentDark} 100%)`,
              border: "none",
              borderRadius: 14,
              color: t.bg,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans'",
              boxShadow: `0 4px 24px ${t.accent}40`,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
