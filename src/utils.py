"""
Utility functions for the TPT Agent.
"""

import logging
import os
from pathlib import Path
from datetime import datetime

import yaml
from dotenv import load_dotenv


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """
    Configure logging for the application.

    Args:
        level: Logging level (e.g., logging.DEBUG, logging.INFO)

    Returns:
        Configured logger instance
    """
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)

    # Create log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = logs_dir / f"tpt_agent_{timestamp}.log"

    # Configure logging format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    logging.basicConfig(
        level=level,
        format=log_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )

    logger = logging.getLogger("tpt_agent")
    logger.info(f"Logging initialized. Log file: {log_file}")

    return logger


def load_settings(config_path: str = "config/settings.yaml") -> dict | None:
    """
    Load settings from YAML config file.

    Args:
        config_path: Path to the settings YAML file

    Returns:
        Dictionary of settings, or None if file not found
    """
    # Load environment variables from .env file if present
    load_dotenv()

    config_file = Path(config_path)

    if not config_file.exists():
        logging.warning(f"Settings file not found: {config_path}")
        logging.info("Copy config/settings.example.yaml to config/settings.yaml")
        return None

    try:
        with open(config_file, 'r') as f:
            settings = yaml.safe_load(f)

        # Override with environment variables if present
        if os.getenv('TPT_EMAIL'):
            settings['tpt']['email'] = os.getenv('TPT_EMAIL')
        if os.getenv('TPT_PASSWORD'):
            settings['tpt']['password'] = os.getenv('TPT_PASSWORD')

        return settings

    except yaml.YAMLError as e:
        logging.error(f"Error parsing settings file: {e}")
        return None
    except Exception as e:
        logging.error(f"Error loading settings: {e}")
        return None


def load_tags(tags_path: str = "config/tags.yaml") -> dict | None:
    """
    Load tag mappings from YAML file.

    Args:
        tags_path: Path to the tags YAML file

    Returns:
        Dictionary of tag mappings, or None if file not found
    """
    tags_file = Path(tags_path)

    if not tags_file.exists():
        logging.warning(f"Tags file not found: {tags_path}")
        return None

    try:
        with open(tags_file, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        logging.error(f"Error loading tags: {e}")
        return None


def ensure_file_exists(filepath: str) -> bool:
    """
    Verify a file exists and is readable.

    Args:
        filepath: Path to the file to check

    Returns:
        True if file exists and is readable, False otherwise
    """
    path = Path(filepath)

    if not path.exists():
        logging.error(f"File not found: {filepath}")
        return False

    if not path.is_file():
        logging.error(f"Not a file: {filepath}")
        return False

    try:
        with open(path, 'rb') as f:
            f.read(1)  # Try to read one byte
        return True
    except PermissionError:
        logging.error(f"Permission denied: {filepath}")
        return False
    except Exception as e:
        logging.error(f"Cannot read file {filepath}: {e}")
        return False


def get_file_extension(filepath: str) -> str:
    """Get lowercase file extension without the dot."""
    return Path(filepath).suffix.lower().lstrip('.')


def is_valid_file_type(filepath: str, allowed_types: list = None) -> bool:
    """
    Check if file has an allowed extension.

    Args:
        filepath: Path to the file
        allowed_types: List of allowed extensions (without dots)

    Returns:
        True if file type is allowed
    """
    if allowed_types is None:
        allowed_types = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip']

    ext = get_file_extension(filepath)
    return ext in allowed_types
