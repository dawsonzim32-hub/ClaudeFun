"""
PaperWrapped - Wrapped Generator

Takes a student's grades and turns them into fun, Spotify Wrapped-style stats.
Each function computes one "slide" of data for the Wrapped experience.
"""

from collections import defaultdict

from models import db, Student, Grade, Assignment, Enrollment, SchoolClass


def generate_wrapped(student_id):
    """
    Build all the Wrapped data for a student.

    Returns a dictionary with everything needed to render the Wrapped slides:
    - student_name, school_name
    - total_assignments, total_classes
    - top_subject (highest average)
    - subject_averages (all subjects with their averages)
    - most_improved (subject with biggest improvement from first half to second half)
    - grade_distribution (count of A/B/C/D/F)
    - highlights (notable achievements)
    - overall_average (across all subjects)
    - trend (list of monthly averages over time)

    Returns None if the student has no grades.
    """
    student = db.session.get(Student, student_id)
    if not student:
        return None

    # Get all grades for this student, joined with assignment and class info
    grades = (
        db.session.query(Grade, Assignment, SchoolClass)
        .join(Assignment, Grade.assignment_id == Assignment.id)
        .join(SchoolClass, Assignment.class_id == SchoolClass.id)
        .join(Enrollment,
              (Enrollment.class_id == SchoolClass.id) &
              (Enrollment.student_id == student_id))
        .filter(Grade.student_id == student_id)
        .order_by(Assignment.date)
        .all()
    )

    if not grades:
        return None

    # --- Compute stats ---

    # Group grades by subject
    subject_scores = defaultdict(list)
    subject_dates = defaultdict(list)
    all_percentages = []

    for grade, assignment, school_class in grades:
        percentage = (grade.score / assignment.max_score) * 100
        subject_scores[school_class.subject].append(percentage)
        subject_dates[school_class.subject].append(
            (assignment.date, percentage)
        )
        all_percentages.append(percentage)

    # Subject averages
    subject_averages = {}
    for subject, scores in subject_scores.items():
        subject_averages[subject] = round(sum(scores) / len(scores), 1)

    # Top subject (highest average)
    top_subject = max(subject_averages, key=subject_averages.get)

    # Most improved: compare first half average to second half average per subject
    most_improved = _compute_most_improved(subject_dates)

    # Grade distribution (A/B/C/D/F based on percentage)
    grade_distribution = _compute_grade_distribution(all_percentages)

    # Overall average
    overall_average = round(sum(all_percentages) / len(all_percentages), 1)

    # Monthly trend
    trend = _compute_monthly_trend(grades)

    # Highlights (fun achievements)
    highlights = _compute_highlights(
        grades, subject_averages, overall_average
    )

    # Count unique classes
    class_ids = set()
    for _, _, school_class in grades:
        class_ids.add(school_class.id)

    return {
        "student_name": student.name,
        "total_assignments": len(grades),
        "total_classes": len(class_ids),
        "top_subject": top_subject,
        "top_subject_average": subject_averages[top_subject],
        "subject_averages": subject_averages,
        "most_improved": most_improved,
        "grade_distribution": grade_distribution,
        "highlights": highlights,
        "overall_average": overall_average,
        "overall_letter": _percentage_to_letter(overall_average),
        "trend": trend,
    }


def _compute_most_improved(subject_dates):
    """
    Find the subject where the student improved the most.
    Compares the average of the first half of assignments
    to the average of the second half.
    """
    best_subject = None
    best_improvement = -999

    for subject, date_scores in subject_dates.items():
        if len(date_scores) < 2:
            continue

        # Sort by date
        sorted_scores = sorted(date_scores, key=lambda x: x[0])
        mid = len(sorted_scores) // 2

        first_half = [s for _, s in sorted_scores[:mid]]
        second_half = [s for _, s in sorted_scores[mid:]]

        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        improvement = second_avg - first_avg

        if improvement > best_improvement:
            best_improvement = improvement
            best_subject = subject

    if best_subject and best_improvement > 0:
        return {
            "subject": best_subject,
            "improvement": round(best_improvement, 1),
        }

    return None


def _compute_grade_distribution(all_percentages):
    """Count how many grades fall into each letter grade bucket."""
    distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for pct in all_percentages:
        letter = _percentage_to_letter(pct)
        distribution[letter] += 1
    return distribution


def _percentage_to_letter(pct):
    """Convert a percentage to a letter grade."""
    if pct >= 90:
        return "A"
    elif pct >= 80:
        return "B"
    elif pct >= 70:
        return "C"
    elif pct >= 60:
        return "D"
    else:
        return "F"


def _compute_monthly_trend(grades):
    """
    Compute average score per month so we can show a trend line.
    Returns a list of {"month": "Jan", "average": 85.2} entries.
    """
    month_names = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    monthly_scores = defaultdict(list)
    for grade, assignment, _ in grades:
        key = (assignment.date.year, assignment.date.month)
        percentage = (grade.score / assignment.max_score) * 100
        monthly_scores[key].append(percentage)

    trend = []
    for key in sorted(monthly_scores.keys()):
        year, month = key
        scores = monthly_scores[key]
        trend.append({
            "month": month_names[month],
            "average": round(sum(scores) / len(scores), 1),
        })

    return trend


def _compute_highlights(grades, subject_averages, overall_average):
    """
    Generate fun highlight messages based on the student's performance.
    These appear as callout cards in the Wrapped experience.
    """
    highlights = []

    # Perfect scores
    perfect_count = sum(
        1 for grade, assignment, _ in grades
        if grade.score == assignment.max_score
    )
    if perfect_count > 0:
        highlights.append({
            "icon": "star",
            "text": f"You got {perfect_count} perfect score{'s' if perfect_count != 1 else ''}!",
        })

    # High overall average
    if overall_average >= 90:
        highlights.append({
            "icon": "trophy",
            "text": "You maintained an A average all year!",
        })
    elif overall_average >= 80:
        highlights.append({
            "icon": "thumbs-up",
            "text": "Solid B average - great consistency!",
        })

    # Strong subject
    for subject, avg in subject_averages.items():
        if avg >= 95:
            highlights.append({
                "icon": "fire",
                "text": f"You crushed it in {subject} with a {avg}% average!",
            })
            break  # Only show one to keep it punchy

    # Total assignments completed
    total = len(grades)
    if total >= 50:
        highlights.append({
            "icon": "rocket",
            "text": f"You completed {total} assignments this year!",
        })

    # If no highlights, give an encouraging one
    if not highlights:
        highlights.append({
            "icon": "sparkle",
            "text": "Every assignment is a step forward. Keep going!",
        })

    return highlights
