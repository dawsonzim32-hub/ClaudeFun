# Bloom

**Cycle-synced workouts that move with your body.**

Bloom adapts your training to where you are in your menstrual cycle — so you're always working *with* your body, not against it.

## Features

- **4 Cycle Phases** — Menstrual, Follicular, Ovulatory, Luteal
- **Phase-matched workouts** — intensity adapts to your biology
- **Bloom Creature** — your animated companion that grows with XP
- **Streak tracking** — build consistency, earn bonus XP
- **Safety settings** — low-impact mode, no-floor-work mode
- **Exercise substitutions** — automatic swaps for high-impact moves
- **Onboarding** — welcoming first-time experience

## Getting Started (Development)

```bash
cd bloom
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Building for iOS

You need a Mac with Xcode installed and an Apple Developer account ($99/year).

```bash
# 1. Build the web app
npm run build

# 2. Add iOS platform (first time only)
npx cap add ios

# 3. Sync your build to the iOS project
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

From Xcode, you can run on a simulator or your real device.

## Project Structure

```
bloom/
├── index.html              # Entry point
├── capacitor.config.json   # iOS/native config
├── src/
│   ├── main.jsx            # React entry
│   ├── App.jsx             # Main app (routing + browse screen)
│   ├── components/         # UI components
│   │   ├── ActiveWorkout   # Workout timer screen
│   │   ├── BloomCreature   # Animated companion
│   │   ├── CircularTimer   # Countdown ring
│   │   ├── Onboarding      # First-time welcome
│   │   ├── PauseOverlay    # Pause modal
│   │   ├── SettingsDrawer  # Safety settings
│   │   ├── WorkoutComplete # Celebration screen
│   │   └── WorkoutPreview  # Workout detail
│   ├── data/               # Static data
│   │   ├── bloom-stages    # XP growth stages
│   │   ├── phases          # Cycle phase colors/themes
│   │   ├── substitutions   # Low-impact swaps
│   │   └── workouts        # All workout definitions
│   ├── hooks/              # Custom React hooks
│   │   └── useOverlay      # Focus trap + Esc close
│   ├── state/              # State management
│   │   └── appReducer      # Reducer + persistence
│   └── styles/             # CSS
│       ├── animations.css  # Bloom keyframes
│       └── global.css      # iOS-ready resets
```

## App Store Checklist

- [ ] Get an Apple Developer Account ($99/year at developer.apple.com)
- [ ] Create app icons (1024x1024 required)
- [ ] Create screenshots for App Store listing
- [ ] Write App Store description and keywords
- [ ] Set up privacy policy URL (required by Apple)
- [ ] Test on a real iOS device
- [ ] Submit for review through App Store Connect
