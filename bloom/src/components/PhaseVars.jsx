import { PHASES } from "../data/phases.js";

// Injects phase-specific CSS custom properties so child components
// can reference colors via var(--ph-accent) etc.
export default function PhaseVars({ phase, children }) {
  const t = PHASES[phase];
  return (
    <div
      style={{
        "--ph-bg": t.bg,
        "--ph-bg-grad": t.bgGrad,
        "--ph-accent": t.accent,
        "--ph-accent-dark": t.accentDark,
        "--ph-surface": t.surface,
        "--ph-border": t.border,
        "--ph-text": t.text,
        "--ph-muted": t.muted,
        "--ph-glow": t.glow,
      }}
    >
      {children}
    </div>
  );
}
