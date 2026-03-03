"""
PaperWrapped - Database Models

Defines all the data tables: teachers, classes, students, assignments, and grades.
Think of each class below as a spreadsheet table.
"""

from datetime import datetime, timezone
import secrets

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

# This creates the database connection - used by app.py
db = SQLAlchemy()


class Teacher(UserMixin, db.Model):
    """A teacher who logs in to enter grades and generate Wrappeds."""

    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # A teacher has many classes
    classes = db.relationship("SchoolClass", backref="teacher", lazy=True)

    def set_password(self, password):
        """Hash and store the password (never store plain text)."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if a password matches the stored hash."""
        return check_password_hash(self.password_hash, password)


class SchoolClass(db.Model):
    """A class/course taught by a teacher (e.g., '5th Grade Math')."""

    __tablename__ = "classes"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    year = db.Column(db.String(20), nullable=False)  # e.g., "2025-2026"
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id"), nullable=False
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # A class has many assignments and many enrolled students
    assignments = db.relationship("Assignment", backref="school_class", lazy=True)
    enrollments = db.relationship("Enrollment", backref="school_class", lazy=True)


class Student(db.Model):
    """A student who receives grades and views their Wrapped."""

    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    # Unique code students use to view their Wrapped (no login needed)
    access_code = db.Column(
        db.String(12), unique=True, nullable=False,
        default=lambda: secrets.token_hex(6)
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # A student can be enrolled in many classes
    enrollments = db.relationship("Enrollment", backref="student", lazy=True)
    grades = db.relationship("Grade", backref="student", lazy=True)


class Enrollment(db.Model):
    """Links a student to a class (a student can be in multiple classes)."""

    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id"), nullable=False
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id"), nullable=False
    )

    # Prevent duplicate enrollments
    __table_args__ = (
        db.UniqueConstraint("student_id", "class_id", name="unique_enrollment"),
    )


class Assignment(db.Model):
    """A graded assignment within a class."""

    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id"), nullable=False
    )

    grades = db.relationship("Grade", backref="assignment", lazy=True)


class Grade(db.Model):
    """A single grade: one student's score on one assignment."""

    __tablename__ = "grades"

    id = db.Column(db.Integer, primary_key=True)
    score = db.Column(db.Float, nullable=False)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id"), nullable=False
    )
    assignment_id = db.Column(
        db.Integer, db.ForeignKey("assignments.id"), nullable=False
    )
    entered_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # One grade per student per assignment
    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "assignment_id", name="unique_grade"
        ),
    )
