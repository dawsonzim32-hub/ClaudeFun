"""
PaperWrapped - Application Configuration

Loads settings from environment variables (via .env file).
"""

import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()


class Config:
    """Main app configuration. Values come from environment variables."""

    # Secret key for session cookies - MUST be changed in production
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-me")

    # Database location (default: SQLite file in this folder)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///paperwrapped.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # School name displayed in the Wrapped experience
    SCHOOL_NAME = os.environ.get("SCHOOL_NAME", "Our School")
