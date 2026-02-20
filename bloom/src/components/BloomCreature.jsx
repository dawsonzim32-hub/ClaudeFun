import { useMemo } from "react";
import { PHASES } from "../data/phases.js";

// The Bloom creature — your animated companion that reacts to workouts
export default function BloomCreature({
  phase,
  mood = "idle",
  size = 140,
  stage = 0,
}) {
  const t = PHASES[phase];

  const moodAnims = {
    idle: "bloom-breathe 3s ease-in-out infinite",
    cheering: "bloom-bounce 0.6s ease-in-out infinite",
    resting: "bloom-sleep 4s ease-in-out infinite",
    working: "bloom-pulse 1s ease-in-out infinite",
    celebrating: "bloom-wiggle 0.8s ease-in-out 1",
  };

  const celebrateParticles = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        left: 30 + Math.random() * 40,
        top: 20 + Math.random() * 30,
        delay: i * 0.15,
      })),
    []
  );

  const petalCount = Math.min(stage + 3, 8);
  const petalSize = 14 + stage * 2;

  const getEyes = () => {
    switch (mood) {
      case "cheering":
        return (
          <>
            <text x="90" y="82" fontSize="9" fill={t.bg}>
              \u2726
            </text>
            <text x="104" y="82" fontSize="9" fill={t.bg}>
              \u2726
            </text>
          </>
        );
      case "resting":
        return (
          <>
            <path
              d="M91 80 Q93 83 96 80"
              stroke={t.bg}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M104 80 Q106 83 109 80"
              stroke={t.bg}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
      case "celebrating":
        return (
          <>
            <text x="89" y="82" fontSize="9" fill={t.bg}>
              \u2605
            </text>
            <text x="103" y="82" fontSize="9" fill={t.bg}>
              \u2605
            </text>
          </>
        );
      case "working":
        return (
          <>
            <circle cx="94" cy="79" r="3.5" fill={t.bg} />
            <circle cx="106" cy="79" r="3.5" fill={t.bg} />
            <circle cx="95" cy="78" r="1.3" fill="white" />
            <circle cx="107" cy="78" r="1.3" fill="white" />
          </>
        );
      default:
        return (
          <>
            <circle cx="94" cy="79" r="3" fill={t.bg} />
            <circle cx="106" cy="79" r="3" fill={t.bg} />
          </>
        );
    }
  };

  const getMouth = () => {
    switch (mood) {
      case "cheering":
        return (
          <path
            d="M93 86 Q100 93 107 86"
            stroke={t.bg}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        );
      case "celebrating":
        return (
          <path
            d="M92 86 Q100 95 108 86"
            stroke={t.bg}
            strokeWidth="2.5"
            fill={t.bg}
            opacity="0.3"
            strokeLinecap="round"
          />
        );
      case "working":
        return (
          <ellipse cx="100" cy="88" rx="3" ry="2" fill={t.bg} opacity="0.6" />
        );
      case "resting":
        return null;
      default:
        return (
          <path
            d="M95 86 Q100 89 105 86"
            stroke={t.bg}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        );
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      {/* Glow behind creature */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: "50%",
          background: `radial-gradient(circle,${t.glow} 0%,transparent 70%)`,
          filter: "blur(12px)",
        }}
      />

      {/* Celebration particles */}
      {mood === "celebrating" &&
        celebrateParticles.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: t.accent,
              animation: `bloom-float 1.2s ease-out ${p.delay}s forwards`,
            }}
          />
        ))}

      {/* SVG creature */}
      <svg
        viewBox="0 0 200 160"
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        <g style={{ animation: moodAnims[mood] || moodAnims.idle }}>
          {/* Petals */}
          {Array.from({ length: petalCount }).map((_, i) => (
            <ellipse
              key={i}
              cx="100"
              cy="80"
              rx="7"
              ry={petalSize}
              fill={t.accent}
              opacity={
                mood === "celebrating" ? 0.5 : 0.15 + (i % 2) * 0.1
              }
              transform={`rotate(${(360 / petalCount) * i} 100 80)`}
            />
          ))}
          {/* Body */}
          <circle cx="100" cy="80" r="20" fill={t.accent} opacity="0.35" />
          <circle cx="100" cy="80" r="16" fill={t.accent} opacity="0.75" />
          {/* Face */}
          {getEyes()}
          {getMouth()}
        </g>
      </svg>
    </div>
  );
}
