# PaperWrapped

A visual feedback machine for student papers. Teachers annotate essays, score categories, and deliver results as a Spotify Wrapped-style presentation students actually want to open.

## Features

- **DOCX Import** — Drop in a graded Google Docs or Word file; comments become annotations automatically
- **Paper Annotator** — Highlight text, tag strengths/growth areas/greatest hits, score by category
- **AI Assist** — Claude analyzes the paper and suggests annotations, scores, quiz questions, and a writer profile
- **Customizable Categories** — Rename, recolor, add/remove grading categories (Thesis, Evidence, Analysis, Voice, etc.)
- **Wrapped Presentation** — Full-screen animated slides: stats, annotated paper, greatest hits, growth edge, teacher note, feedback quiz, writer profile
- **QR Code Delivery** — Share via scannable QR code or link

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- **React 18** — UI components
- **Vite** — Dev server and build tool
- **Mammoth.js** — DOCX text extraction
- **Anthropic API** — AI suggestions (called client-side)
