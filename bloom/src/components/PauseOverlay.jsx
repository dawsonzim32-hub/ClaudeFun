import { PHASES } from "../data/phases.js";
import { useOverlay } from "../hooks/useOverlay.js";
import BloomCreature from "./BloomCreature.jsx";

// Shown when the user pauses a workout — gentle encouragement
export default function PauseOverlay({ phase, onResume }) {
  const t = PHASES[phase];
  const overlayRef = useOverlay(true, onResume);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-label="Workout paused"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: `${t.bg}ee`,
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "bloom-fade-in 0.2s ease",
      }}
    >
      <BloomCreature phase={phase} mood="resting" size={120} stage={2} />
      <p
        style={{
          color: t.text,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: "'Cormorant Garamond',serif",
          margin: "12px 0 4px",
        }}
      >
        Paused
      </p>
      <p
        style={{
          color: t.muted,
          fontSize: 14,
          fontFamily: "'Cormorant Garamond',serif",
          fontStyle: "italic",
          margin: "0 0 28px",
        }}
      >
        Breathe. You're still here.
      </p>
      <button
        onClick={onResume}
        style={{
          padding: "16px 48px",
          background: `linear-gradient(135deg,${t.accent} 0%,${t.accentDark} 100%)`,
          border: "none",
          borderRadius: 14,
          color: t.bg,
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'DM Sans',sans-serif",
          boxShadow: `0 4px 24px ${t.accent}40`,
        }}
      >
        \u25B6 Resume
      </button>
    </div>
  );
}
