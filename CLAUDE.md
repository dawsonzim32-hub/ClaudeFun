# CLAUDE.md - AI Assistant Instructions

This file provides instructions for AI assistants working on PaperWrapped.

## Project Overview

PaperWrapped is a React app where teachers annotate student papers and deliver feedback as a Spotify Wrapped-style animated presentation. Teachers highlight text, tag strengths/growth areas, score categories, and the student sees their results as a full-screen slideshow.

**The user is not a programmer.** Write clear, well-commented code and explain technical decisions in plain language.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Build Tool | Vite |
| DOCX Parsing | Mammoth.js + custom ZIP parser |
| AI | Anthropic API (client-side calls) |
| Styling | Inline styles (no CSS framework) |
| Fonts | Outfit, JetBrains Mono, Crimson Pro |

## File Structure

```
PaperWrapped/
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── src/
    ├── main.jsx         # React DOM render entry
    └── App.jsx          # Entire application (single file)
```

## Key Components (all in App.jsx)

- **App** — Root: routes between Dashboard, DeliveryScreen, and Wrapped views
- **Dashboard** — 5-step wizard: Paper → Categories → Annotate → Customize → Preview
- **PaperAnnotator** — Text highlighting, annotation sidebar, score inputs
- **CategoryEditor** — Add/remove/customize grading categories
- **Wrapped** — Full-screen animated slide presentation for students
- **PaperRevealSlide** — Animated paper with highlights that appear one by one
- **QuizSlide** — Interactive feedback comprehension quiz
- **DeliveryScreen** — QR code and shareable link generation
- **QRCodeSVG** — Client-side QR code generator (no dependencies)

## Commit Message Convention

```
type: brief description

Types: feat, fix, docs, refactor, test, chore
```
