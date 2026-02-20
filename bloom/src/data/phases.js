// ═══════════════════════════════════════════════════════════
// Phase definitions — colors, gradients, and philosophy
// Each phase represents a stage of the menstrual cycle
// ═══════════════════════════════════════════════════════════

export const PHASES = {
  menstrual: {
    name: "Inner Winter",
    label: "Menstrual",
    emoji: "\u2744\uFE0F",
    bg: "#1a1128",
    bgGrad: "linear-gradient(160deg,#1a1128 0%,#2d1b4e 40%,#1e1233 100%)",
    accent: "#c4a0e8",
    accentDark: "#8b6aaf",
    surface: "rgba(75,45,110,0.3)",
    border: "rgba(160,120,200,0.2)",
    text: "#e8daf5",
    muted: "#9b82b8",
    glow: "rgba(180,140,220,0.25)",
    philosophy:
      "Honor the rest. Gentle movement restores what intensity depletes.",
  },
  follicular: {
    name: "Inner Spring",
    label: "Follicular",
    emoji: "\uD83C\uDF31",
    bg: "#0a1f17",
    bgGrad: "linear-gradient(160deg,#0a1f17 0%,#0f2e1f 40%,#091a12 100%)",
    accent: "#6dd4a0",
    accentDark: "#3a9468",
    surface: "rgba(30,100,65,0.25)",
    border: "rgba(100,200,140,0.2)",
    text: "#d4f5e4",
    muted: "#7dba99",
    glow: "rgba(100,210,150,0.25)",
    philosophy:
      "Energy is climbing. Build the foundation. Your body is ready for challenge.",
  },
  ovulatory: {
    name: "Inner Summer",
    label: "Ovulatory",
    emoji: "\u2600\uFE0F",
    bg: "#2a1a08",
    bgGrad: "linear-gradient(160deg,#2a1a08 0%,#3d2510 40%,#1f1305 100%)",
    accent: "#ffbf5e",
    accentDark: "#c48a2a",
    surface: "rgba(180,110,40,0.2)",
    border: "rgba(255,190,100,0.25)",
    text: "#fff3df",
    muted: "#c4a06a",
    glow: "rgba(255,200,100,0.3)",
    philosophy:
      "Peak power. Peak confidence. Leave nothing in the tank.",
  },
  luteal: {
    name: "Inner Autumn",
    label: "Luteal",
    emoji: "\uD83C\uDF42",
    bg: "#1f140e",
    bgGrad: "linear-gradient(160deg,#1f140e 0%,#2e1c14 40%,#18100b 100%)",
    accent: "#d4956a",
    accentDark: "#a06840",
    surface: "rgba(160,90,50,0.2)",
    border: "rgba(200,140,90,0.2)",
    text: "#f2e0d0",
    muted: "#b89478",
    glow: "rgba(210,150,100,0.25)",
    philosophy:
      "Steady endurance over raw power. Consistency is its own kind of strength.",
  },
};

// Science-backed explanations shown on the browse screen
export const PHASE_SCIENCE = {
  menstrual:
    "Hormone levels are at their lowest. Your body is prioritizing recovery. Gentle movement can increase blood flow and may help ease cramps \u2014 but pushing too hard now tends to spike cortisol and slow recovery.",
  follicular:
    "Estrogen is rising, which tends to support faster muscle recovery and improved protein synthesis. Many people find this their best window for building strength and trying new movements.",
  ovulatory:
    "Estrogen peaks and testosterone surges briefly. Many people experience higher pain tolerance, faster reaction time, and their best cardiovascular output during this window.",
  luteal:
    "Progesterone is elevated, which can raise your resting body temperature and make high-intensity work feel harder than usual. Steady-state cardio and controlled strength work tend to match how most bodies feel right now.",
};
