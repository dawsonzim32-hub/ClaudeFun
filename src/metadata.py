"""
Metadata handling for product data.
Loads and parses product information from CSV/spreadsheet files.
"""

import csv
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def load_products_csv(csv_path: str) -> list[dict]:
    """
    Load products from a CSV file.

    Args:
        csv_path: Path to the products CSV file

    Returns:
        List of product dictionaries
    """
    path = Path(csv_path)

    if not path.exists():
        logger.error(f"CSV file not found: {csv_path}")
        return []

    products = []

    try:
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            # Validate required columns
            required_columns = {'filename', 'title', 'price', 'grades'}
            if reader.fieldnames:
                missing = required_columns - set(reader.fieldnames)
                if missing:
                    logger.error(f"CSV missing required columns: {missing}")
                    return []

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                # Clean up whitespace in all fields
                cleaned_row = {k: v.strip() if isinstance(v, str) else v for k, v in row.items()}
                cleaned_row['_row_number'] = row_num  # Track for error reporting
                products.append(cleaned_row)

        logger.info(f"Loaded {len(products)} products from {csv_path}")
        return products

    except csv.Error as e:
        logger.error(f"CSV parsing error in {csv_path}: {e}")
        return []
    except UnicodeDecodeError as e:
        logger.error(f"Encoding error reading {csv_path}: {e}")
        logger.info("Try saving the CSV as UTF-8 encoded")
        return []
    except Exception as e:
        logger.error(f"Error reading {csv_path}: {e}")
        return []


def validate_product(product: dict) -> list[str]:
    """
    Validate a single product's data.

    Args:
        product: Product dictionary from CSV

    Returns:
        List of error messages (empty if valid)
    """
    from src.validators import validate_product_complete

    result = validate_product_complete(product)

    # Log warnings (but don't treat as errors)
    for warning in result.get('warnings', []):
        logger.warning(f"Product '{product.get('filename', 'unknown')}': {warning}")

    return result['errors']


def parse_tags(tags_string: str, separator: str = ';') -> list[str]:
    """
    Parse a semicolon-separated string of tags into a list.

    Args:
        tags_string: String like "reading;close-reading;informational"
        separator: Character used to separate tags (default: semicolon)

    Returns:
        List of individual tags
    """
    if not tags_string:
        return []

    tags = [tag.strip() for tag in tags_string.split(separator)]
    return [tag for tag in tags if tag]  # Remove empty strings


def parse_grades(grades_string: str) -> list[str]:
    """
    Parse grade specification into list of individual grades.

    Args:
        grades_string: String like "3-5" or "k-2" or "6"

    Returns:
        List of individual grade levels
    """
    from src.utils import load_tags

    if not grades_string:
        return []

    grades_string = grades_string.strip().lower()

    # Load grade mappings
    tags_config = load_tags()
    if tags_config and 'grade_ranges' in tags_config:
        # Check if it's a predefined range
        if grades_string in tags_config['grade_ranges']:
            return tags_config['grade_ranges'][grades_string]

    # Handle single grade
    if '-' not in grades_string:
        return [grades_string]

    # Handle custom range (e.g., "3-5")
    try:
        start, end = grades_string.split('-')

        # Handle kindergarten
        if start == 'k':
            start_num = 0
        else:
            start_num = int(start)

        end_num = int(end)

        grades = []
        for g in range(start_num, end_num + 1):
            if g == 0:
                grades.append('Kindergarten')
            else:
                grades.append(f'{g}')

        return grades

    except (ValueError, AttributeError):
        logger.warning(f"Could not parse grade range: {grades_string}")
        return [grades_string]


def format_price(price: any) -> str:
    """
    Format price as string with 2 decimal places.

    Args:
        price: Price value (string, int, or float)

    Returns:
        Formatted price string like "4.99"
    """
    try:
        price_float = float(price)
        return f"{price_float:.2f}"
    except (ValueError, TypeError):
        logger.error(f"Invalid price value: {price}")
        return "0.00"
