# CLAUDE.md - AI Assistant Instructions

This file provides instructions for AI assistants working on the PaperWrapped project.

## Project Overview

PaperWrapped is a grading platform that presents student results in a Spotify Wrapped-style experience. Teachers enter grades through a web dashboard, and students view their results as an animated full-screen slideshow.

**The user is not a programmer.** Write clear, well-commented code and explain technical decisions in plain language.

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Language | Python 3.10+ | Beginner-friendly |
| Web Framework | Flask | Simple, well-documented |
| Database | SQLite via Flask-SQLAlchemy | No setup needed |
| Auth | Flask-Login | Session-based teacher accounts |
| Frontend | HTML/CSS/JS (no framework) | No build step required |

## File Structure

```
PaperWrapped/
├── app.py                  # Main Flask app with all routes
├── config.py               # Configuration from environment variables
├── models.py               # Database models (Teacher, Class, Student, etc.)
├── requirements.txt        # Python dependencies
├── static/css/             # Stylesheets (style.css + wrapped.css)
├── static/js/              # JavaScript (wrapped.js for slide animations)
├── templates/              # HTML templates (Jinja2)
├── templates/wrapped/      # The Wrapped experience templates
└── utils/                  # Helper modules
    └── wrapped_generator.py # Computes all Wrapped stats from grades
```

## Key Concepts

- **Teacher**: Logs in with email/password. Creates classes, adds students, enters grades.
- **Student**: No login needed. Uses a unique access code to view their Wrapped.
- **Wrapped**: An animated slideshow computed from a student's grades. Shows top subjects, improvements, grade distribution, trends, and highlights.

## Code Quality Standards

### Every Route Must:
- Validate form inputs before processing
- Flash clear error messages on failure
- Verify ownership (teachers can only see their own classes)

### The Wrapped Experience Must:
- Work on mobile (tap to advance)
- Load quickly (no heavy frameworks)
- Look good with any amount of data
- Handle edge cases (1 class, 1 assignment, etc.)

## Commit Message Convention

```
type: brief description

Types: feat, fix, docs, refactor, test, chore
```
