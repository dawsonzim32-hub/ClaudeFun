import { PHASES } from "../data/phases.js";
import { useOverlay } from "../hooks/useOverlay.js";

// Safety settings — low-impact mode and no-floor-work toggles
export default function SettingsDrawer({
  modifiers,
  onSetModifier,
  phase,
  onClose,
}) {
  const t = PHASES[phase];
  const overlayRef = useOverlay(true, onClose);

  const Toggle = ({ label, description, value, modKey }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>
          {description}
        </div>
      </div>
      <button
        onClick={() => onSetModifier(modKey, !value)}
        aria-label={`${label} ${value ? "on" : "off"}`}
        role="switch"
        aria-checked={value}
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          border: "none",
          cursor: "pointer",
          background: value ? t.accent : `${t.accent}25`,
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0,
          marginLeft: 12,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: "white",
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            transition: "left 0.2s ease",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </div>
  );

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-label="Safety settings"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: `${t.bg}ee`,
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        animation: "bloom-fade-in 0.2s ease",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            color: t.text,
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Safety Settings
        </h2>
        <button
          onClick={onClose}
          aria-label="Close settings"
          style={{
            background: "none",
            border: "none",
            color: t.muted,
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          \u2715
        </button>
      </div>
      <div style={{ padding: "0 20px" }}>
        <Toggle
          label="\uD83E\uDD2B Low-impact only"
          description="Show substitution tips for jumping, bounding, and plyometric moves"
          value={modifiers.lowImpactOnly}
          modKey="lowImpactOnly"
        />
        <Toggle
          label="\uD83E\uDDCD No floor work"
          description="Flag exercises that require lying down or hands-and-knees"
          value={modifiers.noFloorWork}
          modKey="noFloorWork"
        />
      </div>
      <div style={{ padding: "20px", marginTop: "auto" }}>
        <p
          style={{
            color: t.muted,
            fontSize: 12,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          These settings show warnings and substitution tips — they don't
          hide workouts, so you always have full choice.
        </p>
      </div>
    </div>
  );
}
