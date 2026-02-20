import { PHASES } from "../data/phases.js";

// Circular countdown timer with animated ring
export default function CircularTimer({
  timeLeft,
  totalTime,
  phase,
  size = 170,
}) {
  const t = PHASES[phase];
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  const isLow = timeLeft <= 3 && timeLeft > 0;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`${t.accent}15`}
          strokeWidth="6"
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.accent}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      {/* Time display */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: t.text,
            fontFamily: "'DM Mono','DM Sans',monospace",
            letterSpacing: 2,
            animation: isLow
              ? "bloom-countdown 1s ease-in-out infinite"
              : "none",
            textShadow: isLow ? `0 0 20px ${t.accent}` : "none",
          }}
        >
          {min}:{sec.toString().padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
