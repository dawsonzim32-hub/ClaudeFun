# PaperWrapped

A grading platform that gives students their results in a Spotify Wrapped-style experience. Because report cards should be fun.

## What It Does

**For teachers:** Enter grades, manage classes, and generate personalized Wrappeds for every student.

**For students:** See your year in review with animated slides showing your top subjects, highlights, and growth - just like Spotify Wrapped, but for your grades.

## The Wrapped Experience

Students get a full-screen animated slideshow with:
- **Your Year in Numbers** - total assignments and classes
- **Top Subject** - highest performing subject
- **Subject Breakdown** - bar chart of all subject averages
- **Most Improved** - where they grew the most
- **Grade Mix** - visual breakdown of A/B/C/D/F
- **Your Journey** - monthly trend line
- **Highlights** - fun achievements (perfect scores, streaks, etc.)
- **Final Summary** - overall grade with encouragement

## Getting Started

### Prerequisites
- Python 3.10+

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Copy the example environment file
cp .env.example .env

# Run the app
python app.py
```

The app will start at `http://localhost:5000`.

### First Steps

1. Go to the app and click **"I'm a Teacher"**
2. Create an account
3. Add a class (e.g., "Period 3 - English")
4. Add students to the class
5. Create assignments and enter grades
6. Share each student's access code with them
7. Students visit the site, enter their code, and see their Wrapped!

### Importing Grades from CSV

You can bulk-import grades using a CSV file with these columns:

```
student_name,assignment_name,score,max_score,date
Alex Smith,Quiz 1,45,50,2025-09-15
Alex Smith,Essay 1,88,100,2025-10-01
Jordan Lee,Quiz 1,42,50,2025-09-15
```

Upload the CSV from the class view page.

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Backend | Flask (Python) | Simple, beginner-friendly |
| Database | SQLite | No setup needed, just works |
| Auth | Flask-Login | Session-based teacher accounts |
| Frontend | HTML/CSS/JS | No build step, clean animations |
| Wrapped animations | Vanilla CSS + Canvas | Lightweight, no heavy frameworks |

## Project Structure

```
PaperWrapped/
├── app.py                  # Main Flask application (routes)
├── config.py               # App configuration
├── models.py               # Database tables
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
├── static/
│   ├── css/
│   │   ├── style.css       # Dashboard & general styles
│   │   └── wrapped.css     # Wrapped experience styles
│   └── js/
│       └── wrapped.js      # Wrapped slide animations
├── templates/
│   ├── base.html           # Base layout
│   ├── index.html          # Landing page
│   ├── login.html          # Teacher login
│   ├── register.html       # Teacher registration
│   ├── student_lookup.html # Student code entry
│   ├── dashboard.html      # Teacher dashboard
│   ├── class_form.html     # New class form
│   ├── class_view.html     # Class detail + gradebook
│   ├── enter_grades.html   # Grade entry form
│   ├── student_codes.html  # Printable access codes
│   └── wrapped/
│       ├── wrapped.html    # The Wrapped experience
│       └── no_data.html    # Shown when no grades yet
└── utils/
    └── wrapped_generator.py # Computes Wrapped stats
```

## License

MIT
