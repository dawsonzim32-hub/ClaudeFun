"""
PaperWrapped - Main Application

A grading platform that presents student results in a Spotify Wrapped style.
Teachers enter grades, students see their results as an animated slideshow.

To run:
    pip install -r requirements.txt
    python app.py
"""

import csv
import io

from flask import (
    Flask, render_template, request, redirect, url_for, flash, abort
)
from flask_login import (
    LoginManager, login_user, logout_user, login_required, current_user
)

from config import Config
from models import (
    db, Teacher, SchoolClass, Student, Enrollment, Assignment, Grade
)
from utils.wrapped_generator import generate_wrapped


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)

# Initialize login manager (handles teacher sessions)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"  # Redirect here if not logged in


@login_manager.user_loader
def load_user(user_id):
    """Flask-Login calls this to reload the teacher from the session."""
    return db.session.get(Teacher, int(user_id))


# Create tables on first run
with app.app_context():
    db.create_all()


# ---------------------------------------------------------------------------
# Public routes (no login needed)
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Landing page with login link and student access."""
    return render_template("index.html")


@app.route("/wrapped/<access_code>")
def view_wrapped(access_code):
    """
    Student Wrapped view - the main attraction!
    Students open this link using their unique access code.
    No login needed - the code is their key.
    """
    student = Student.query.filter_by(access_code=access_code).first()
    if not student:
        abort(404)

    data = generate_wrapped(student.id)
    if not data:
        return render_template("wrapped/no_data.html", student=student)

    return render_template(
        "wrapped/wrapped.html",
        data=data,
        school_name=app.config["SCHOOL_NAME"],
    )


@app.route("/student-lookup", methods=["GET", "POST"])
def student_lookup():
    """Students enter their access code here to view their Wrapped."""
    if request.method == "POST":
        code = request.form.get("access_code", "").strip()
        student = Student.query.filter_by(access_code=code).first()
        if student:
            return redirect(url_for("view_wrapped", access_code=code))
        flash("Code not found. Check with your teacher for the right code.", "error")
    return render_template("student_lookup.html")


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    """Teacher login page."""
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        teacher = Teacher.query.filter_by(email=email).first()
        if teacher and teacher.check_password(password):
            login_user(teacher)
            return redirect(url_for("dashboard"))

        flash("Invalid email or password.", "error")

    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    """Teacher registration page."""
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        # Basic validation
        if not name or not email or not password:
            flash("All fields are required.", "error")
        elif len(password) < 6:
            flash("Password must be at least 6 characters.", "error")
        elif Teacher.query.filter_by(email=email).first():
            flash("An account with that email already exists.", "error")
        else:
            teacher = Teacher(name=name, email=email)
            teacher.set_password(password)
            db.session.add(teacher)
            db.session.commit()
            login_user(teacher)
            flash(f"Welcome, {name}! Your account is ready.", "success")
            return redirect(url_for("dashboard"))

    return render_template("register.html")


@app.route("/logout")
@login_required
def logout():
    """Log the teacher out."""
    logout_user()
    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# Teacher dashboard routes
# ---------------------------------------------------------------------------

@app.route("/dashboard")
@login_required
def dashboard():
    """Teacher's main dashboard showing all their classes."""
    classes = SchoolClass.query.filter_by(teacher_id=current_user.id).all()
    return render_template("dashboard.html", classes=classes)


@app.route("/class/new", methods=["GET", "POST"])
@login_required
def new_class():
    """Create a new class."""
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        subject = request.form.get("subject", "").strip()
        year = request.form.get("year", "").strip()

        if not name or not subject or not year:
            flash("All fields are required.", "error")
        else:
            school_class = SchoolClass(
                name=name, subject=subject, year=year,
                teacher_id=current_user.id
            )
            db.session.add(school_class)
            db.session.commit()
            flash(f"Class '{name}' created!", "success")
            return redirect(url_for("view_class", class_id=school_class.id))

    return render_template("class_form.html", editing=False)


@app.route("/class/<int:class_id>")
@login_required
def view_class(class_id):
    """View a class with its students and assignments."""
    school_class = _get_teacher_class(class_id)

    # Get enrolled students
    enrollments = Enrollment.query.filter_by(class_id=class_id).all()
    students = [e.student for e in enrollments]

    # Get assignments sorted by date
    assignments = (
        Assignment.query
        .filter_by(class_id=class_id)
        .order_by(Assignment.date.desc())
        .all()
    )

    # Build a grade lookup: {(student_id, assignment_id): score}
    grade_lookup = {}
    for assignment in assignments:
        for grade in assignment.grades:
            grade_lookup[(grade.student_id, assignment.id)] = grade.score

    return render_template(
        "class_view.html",
        school_class=school_class,
        students=students,
        assignments=assignments,
        grade_lookup=grade_lookup,
    )


@app.route("/class/<int:class_id>/add-student", methods=["POST"])
@login_required
def add_student(class_id):
    """Add a student to a class."""
    school_class = _get_teacher_class(class_id)
    name = request.form.get("name", "").strip()

    if not name:
        flash("Student name is required.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    # Check if student already exists (by name, for simplicity)
    student = Student.query.filter_by(name=name).first()
    if not student:
        student = Student(name=name)
        db.session.add(student)
        db.session.flush()  # Get the student ID before creating enrollment

    # Check if already enrolled
    existing = Enrollment.query.filter_by(
        student_id=student.id, class_id=class_id
    ).first()
    if existing:
        flash(f"{name} is already in this class.", "error")
    else:
        enrollment = Enrollment(student_id=student.id, class_id=class_id)
        db.session.add(enrollment)
        db.session.commit()
        flash(f"{name} added! Their access code is: {student.access_code}", "success")

    return redirect(url_for("view_class", class_id=class_id))


@app.route("/class/<int:class_id>/add-students-bulk", methods=["POST"])
@login_required
def add_students_bulk(class_id):
    """Add multiple students at once from a CSV or text list."""
    school_class = _get_teacher_class(class_id)
    text = request.form.get("student_names", "").strip()

    if not text:
        flash("No names provided.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    # Accept comma-separated or one-per-line
    names = []
    for line in text.replace(",", "\n").split("\n"):
        name = line.strip()
        if name:
            names.append(name)

    added = 0
    for name in names:
        student = Student.query.filter_by(name=name).first()
        if not student:
            student = Student(name=name)
            db.session.add(student)
            db.session.flush()

        existing = Enrollment.query.filter_by(
            student_id=student.id, class_id=class_id
        ).first()
        if not existing:
            db.session.add(
                Enrollment(student_id=student.id, class_id=class_id)
            )
            added += 1

    db.session.commit()
    flash(f"Added {added} student(s) to the class.", "success")
    return redirect(url_for("view_class", class_id=class_id))


@app.route("/class/<int:class_id>/add-assignment", methods=["POST"])
@login_required
def add_assignment(class_id):
    """Create a new assignment for a class."""
    school_class = _get_teacher_class(class_id)

    name = request.form.get("name", "").strip()
    max_score = request.form.get("max_score", "").strip()
    date = request.form.get("date", "").strip()

    if not name or not max_score or not date:
        flash("All assignment fields are required.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    try:
        max_score_val = float(max_score)
        if max_score_val <= 0:
            raise ValueError("Must be positive")
    except ValueError:
        flash("Max score must be a positive number.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    from datetime import date as date_type
    try:
        parts = date.split("-")
        assignment_date = date_type(int(parts[0]), int(parts[1]), int(parts[2]))
    except (ValueError, IndexError):
        flash("Invalid date format. Use YYYY-MM-DD.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    assignment = Assignment(
        name=name, max_score=max_score_val,
        date=assignment_date, class_id=class_id
    )
    db.session.add(assignment)
    db.session.commit()
    flash(f"Assignment '{name}' added!", "success")
    return redirect(url_for("view_class", class_id=class_id))


@app.route("/class/<int:class_id>/enter-grades/<int:assignment_id>",
           methods=["GET", "POST"])
@login_required
def enter_grades(class_id, assignment_id):
    """Enter or update grades for all students on an assignment."""
    school_class = _get_teacher_class(class_id)
    assignment = db.session.get(Assignment, assignment_id)
    if not assignment or assignment.class_id != class_id:
        abort(404)

    enrollments = Enrollment.query.filter_by(class_id=class_id).all()
    students = [e.student for e in enrollments]

    # Existing grades for this assignment
    existing_grades = {
        g.student_id: g
        for g in Grade.query.filter_by(assignment_id=assignment_id).all()
    }

    if request.method == "POST":
        saved = 0
        for student in students:
            score_str = request.form.get(f"score_{student.id}", "").strip()
            if not score_str:
                continue  # Skip blank entries

            try:
                score = float(score_str)
            except ValueError:
                flash(f"Invalid score for {student.name}: '{score_str}'", "error")
                continue

            if score < 0 or score > assignment.max_score:
                flash(
                    f"Score for {student.name} must be between 0 and {assignment.max_score}.",
                    "error"
                )
                continue

            # Update existing grade or create new one
            if student.id in existing_grades:
                existing_grades[student.id].score = score
            else:
                db.session.add(Grade(
                    score=score,
                    student_id=student.id,
                    assignment_id=assignment_id,
                ))
            saved += 1

        db.session.commit()
        flash(f"Saved {saved} grade(s).", "success")
        return redirect(url_for("view_class", class_id=class_id))

    return render_template(
        "enter_grades.html",
        school_class=school_class,
        assignment=assignment,
        students=students,
        existing_grades=existing_grades,
    )


@app.route("/class/<int:class_id>/import-grades", methods=["POST"])
@login_required
def import_grades(class_id):
    """
    Import grades from a CSV file.
    Expected format: student_name,assignment_name,score,max_score,date
    """
    school_class = _get_teacher_class(class_id)
    file = request.files.get("csv_file")

    if not file or not file.filename.endswith(".csv"):
        flash("Please upload a CSV file.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    try:
        content = file.stream.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
    except Exception:
        flash("Could not read the CSV file. Make sure it's valid.", "error")
        return redirect(url_for("view_class", class_id=class_id))

    required = {"student_name", "assignment_name", "score", "max_score", "date"}
    if not required.issubset(set(reader.fieldnames or [])):
        flash(
            f"CSV must have columns: {', '.join(sorted(required))}",
            "error"
        )
        return redirect(url_for("view_class", class_id=class_id))

    from datetime import date as date_type

    imported = 0
    for row_num, row in enumerate(reader, start=2):
        student_name = row["student_name"].strip()
        assignment_name = row["assignment_name"].strip()
        score_str = row["score"].strip()
        max_score_str = row["max_score"].strip()
        date_str = row["date"].strip()

        if not all([student_name, assignment_name, score_str, max_score_str, date_str]):
            flash(f"Row {row_num}: missing data, skipped.", "error")
            continue

        try:
            score = float(score_str)
            max_score = float(max_score_str)
            parts = date_str.split("-")
            a_date = date_type(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            flash(f"Row {row_num}: invalid number or date, skipped.", "error")
            continue

        # Find or create student
        student = Student.query.filter_by(name=student_name).first()
        if not student:
            student = Student(name=student_name)
            db.session.add(student)
            db.session.flush()

        # Ensure enrollment
        if not Enrollment.query.filter_by(
            student_id=student.id, class_id=class_id
        ).first():
            db.session.add(
                Enrollment(student_id=student.id, class_id=class_id)
            )

        # Find or create assignment
        assignment = Assignment.query.filter_by(
            name=assignment_name, class_id=class_id
        ).first()
        if not assignment:
            assignment = Assignment(
                name=assignment_name, max_score=max_score,
                date=a_date, class_id=class_id
            )
            db.session.add(assignment)
            db.session.flush()

        # Create or update grade
        existing = Grade.query.filter_by(
            student_id=student.id, assignment_id=assignment.id
        ).first()
        if existing:
            existing.score = score
        else:
            db.session.add(Grade(
                score=score, student_id=student.id,
                assignment_id=assignment.id,
            ))
        imported += 1

    db.session.commit()
    flash(f"Imported {imported} grade(s) from CSV.", "success")
    return redirect(url_for("view_class", class_id=class_id))


@app.route("/class/<int:class_id>/student-codes")
@login_required
def student_codes(class_id):
    """Show all student access codes for sharing (printable page)."""
    school_class = _get_teacher_class(class_id)
    enrollments = Enrollment.query.filter_by(class_id=class_id).all()
    students = [e.student for e in enrollments]

    return render_template(
        "student_codes.html",
        school_class=school_class,
        students=students,
    )


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _get_teacher_class(class_id):
    """Get a class, verifying it belongs to the logged-in teacher."""
    school_class = db.session.get(SchoolClass, class_id)
    if not school_class or school_class.teacher_id != current_user.id:
        abort(404)
    return school_class


# ---------------------------------------------------------------------------
# Run the app
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)
