"""
Validation functions for product data.

QUALITY CONTROL: This module is critical for preventing upload errors.
All validation functions should be thorough and err on the side of caution.
"""

import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# Price validation constants
MIN_PRICE = 0.00  # Free products allowed
MAX_PRICE = 100.00  # Sanity check - warn above this
LOW_PRICE_WARNING = 1.00  # Warn if price seems too low
HIGH_PRICE_WARNING = 25.00  # Warn if price seems high


def validate_required_field(value: any, field_name: str) -> Optional[str]:
    """
    Check that a required field has a value.

    Returns:
        Error message if invalid, None if valid
    """
    if value is None:
        return f"{field_name} is required but missing"

    if isinstance(value, str) and not value.strip():
        return f"{field_name} is required but empty"

    return None


def validate_price(price: any) -> tuple[bool, list[str], list[str]]:
    """
    Validate product price.

    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    errors = []
    warnings = []

    # Check if price exists
    if price is None or price == '':
        errors.append("Price is required")
        return False, errors, warnings

    # Try to convert to float
    try:
        price_float = float(price)
    except (ValueError, TypeError):
        errors.append(f"Price must be a number, got: {price}")
        return False, errors, warnings

    # Check for negative price
    if price_float < 0:
        errors.append(f"Price cannot be negative: ${price_float}")
        return False, errors, warnings

    # Check maximum price (sanity check)
    if price_float > MAX_PRICE:
        errors.append(f"Price ${price_float} exceeds maximum ${MAX_PRICE}")
        return False, errors, warnings

    # Warnings for unusual prices
    if 0 < price_float < LOW_PRICE_WARNING:
        warnings.append(f"Price ${price_float:.2f} seems low - is this correct?")

    if price_float > HIGH_PRICE_WARNING:
        warnings.append(f"Price ${price_float:.2f} is above ${HIGH_PRICE_WARNING} - please verify")

    return True, errors, warnings


def validate_title(title: str) -> tuple[bool, list[str]]:
    """
    Validate product title.

    Returns:
        Tuple of (is_valid, errors)
    """
    errors = []

    if not title or not title.strip():
        errors.append("Title is required")
        return False, errors

    title = title.strip()

    # Check minimum length
    if len(title) < 5:
        errors.append(f"Title too short ({len(title)} chars). Minimum 5 characters.")
        return False, errors

    # Check maximum length (TPT may have limits)
    if len(title) > 200:
        errors.append(f"Title too long ({len(title)} chars). Maximum 200 characters.")
        return False, errors

    return True, errors


def validate_description(description: str) -> tuple[bool, list[str], list[str]]:
    """
    Validate product description.

    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    errors = []
    warnings = []

    if not description or not description.strip():
        warnings.append("Description is empty - consider adding one for better visibility")
        return True, errors, warnings  # Empty description is allowed but warned

    description = description.strip()

    # Warn if very short
    if len(description) < 50:
        warnings.append(f"Description is short ({len(description)} chars) - longer descriptions perform better")

    return True, errors, warnings


def validate_grades(grades: str) -> tuple[bool, list[str]]:
    """
    Validate grade level specification.

    Returns:
        Tuple of (is_valid, errors)
    """
    errors = []

    if not grades or not grades.strip():
        errors.append("Grade levels are required")
        return False, errors

    # Valid grade patterns
    valid_patterns = [
        r'^prek$', r'^k$', r'^[1-9]$', r'^1[0-2]$',  # Single grades
        r'^[k1-9]-[1-9]$', r'^[k1-9]-1[0-2]$',  # Ranges like k-2, 3-5, 9-12
        r'^higher-ed$', r'^adult$', r'^staff$'
    ]

    grades_lower = grades.strip().lower()

    # Check if any pattern matches
    is_valid_format = any(re.match(p, grades_lower) for p in valid_patterns)

    if not is_valid_format:
        errors.append(f"Invalid grade format: '{grades}'. Use formats like: k, 3, 3-5, 6-8, 9-12")

    return len(errors) == 0, errors


def validate_file_exists(filepath: str, products_folder: str = "./products") -> tuple[bool, list[str]]:
    """
    Validate that the product file exists.

    Returns:
        Tuple of (is_valid, errors)
    """
    errors = []

    if not filepath:
        errors.append("Filename is required")
        return False, errors

    full_path = Path(products_folder) / filepath

    if not full_path.exists():
        errors.append(f"File not found: {full_path}")
        return False, errors

    if not full_path.is_file():
        errors.append(f"Not a file: {full_path}")
        return False, errors

    # Check file extension
    allowed_extensions = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.zip'}
    if full_path.suffix.lower() not in allowed_extensions:
        errors.append(f"Unsupported file type: {full_path.suffix}. Allowed: {', '.join(allowed_extensions)}")
        return False, errors

    return True, errors


def validate_product_complete(product: dict, products_folder: str = "./products") -> dict:
    """
    Run all validations on a product.

    Returns:
        Dictionary with 'valid', 'errors', and 'warnings' keys
    """
    all_errors = []
    all_warnings = []

    # Required field: filename
    if error := validate_required_field(product.get('filename'), 'filename'):
        all_errors.append(error)
    else:
        valid, errors = validate_file_exists(product['filename'], products_folder)
        all_errors.extend(errors)

    # Required field: title
    if error := validate_required_field(product.get('title'), 'title'):
        all_errors.append(error)
    else:
        valid, errors = validate_title(product['title'])
        all_errors.extend(errors)

    # Required field: price
    valid, errors, warnings = validate_price(product.get('price'))
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    # Required field: grades
    if error := validate_required_field(product.get('grades'), 'grades'):
        all_errors.append(error)
    else:
        valid, errors = validate_grades(product['grades'])
        all_errors.extend(errors)

    # Optional but recommended: description
    valid, errors, warnings = validate_description(product.get('description', ''))
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    return {
        'valid': len(all_errors) == 0,
        'errors': all_errors,
        'warnings': all_warnings
    }
