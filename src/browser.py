"""
Browser automation for TPT interactions.
Uses Playwright for reliable browser control.
"""

import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class TPTBrowser:
    """
    Handles browser automation for TPT website interactions.

    IMPORTANT: All browser actions should:
    1. Wait for elements before interacting
    2. Verify state after actions
    3. Log every significant step
    4. Handle errors gracefully
    """

    def __init__(self, settings: dict):
        """
        Initialize the TPT browser controller.

        Args:
            settings: Configuration dictionary with browser settings
        """
        self.settings = settings
        self.browser = None
        self.context = None
        self.page = None
        self.is_logged_in = False

        # Browser settings with defaults
        self.headless = settings.get('browser', {}).get('headless', False)
        self.slow_motion = settings.get('browser', {}).get('slow_motion', 100)
        self.timeout = settings.get('browser', {}).get('timeout', 30000)

    async def start(self):
        """
        Start the browser instance.

        Returns:
            True if browser started successfully
        """
        try:
            from playwright.async_api import async_playwright

            logger.info("Starting browser...")

            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                slow_mo=self.slow_motion
            )

            self.context = await self.browser.new_context()
            self.page = await self.context.new_page()
            self.page.set_default_timeout(self.timeout)

            logger.info("Browser started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start browser: {e}")
            return False

    async def close(self):
        """Close the browser and cleanup."""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Error closing browser: {e}")

    async def login(self, email: str, password: str) -> bool:
        """
        Log in to TPT seller account.

        Args:
            email: TPT account email
            password: TPT account password

        Returns:
            True if login successful
        """
        if not email or not password:
            logger.error("Email and password are required for login")
            return False

        try:
            logger.info("Navigating to TPT login page...")

            # Navigate to login page
            await self.page.goto("https://www.teacherspayteachers.com/Login")

            # Wait for login form
            await self.page.wait_for_selector('input[name="email"]', timeout=self.timeout)

            # Fill in credentials
            logger.info("Entering credentials...")
            await self.page.fill('input[name="email"]', email)
            await self.page.fill('input[name="password"]', password)

            # Submit form
            await self.page.click('button[type="submit"]')

            # Wait for navigation and verify login
            await self.page.wait_for_load_state('networkidle')

            # Check if login was successful (look for seller dashboard elements)
            # This selector needs to be verified against actual TPT site
            try:
                await self.page.wait_for_selector('[data-testid="seller-dashboard"]', timeout=10000)
                self.is_logged_in = True
                logger.info("Login successful")
                return True
            except:
                # Try alternative check - look for common logged-in elements
                if await self.page.locator('text="My Products"').count() > 0:
                    self.is_logged_in = True
                    logger.info("Login successful")
                    return True

                logger.error("Login may have failed - could not verify logged-in state")
                return False

        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False

    async def take_screenshot(self, name: str = None) -> str:
        """
        Take a screenshot for verification/debugging.

        Args:
            name: Optional name for the screenshot file

        Returns:
            Path to the saved screenshot
        """
        try:
            # Create screenshots directory
            screenshots_dir = Path("logs/screenshots")
            screenshots_dir.mkdir(parents=True, exist_ok=True)

            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}.png" if name else f"screenshot_{timestamp}.png"
            filepath = screenshots_dir / filename

            await self.page.screenshot(path=str(filepath))
            logger.info(f"Screenshot saved: {filepath}")

            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to take screenshot: {e}")
            return None

    async def navigate_to_new_product(self) -> bool:
        """
        Navigate to the 'Add New Product' page.

        Returns:
            True if navigation successful
        """
        if not self.is_logged_in:
            logger.error("Must be logged in before navigating to new product page")
            return False

        try:
            logger.info("Navigating to Add New Product page...")

            # This URL needs to be verified against actual TPT site
            await self.page.goto("https://www.teacherspayteachers.com/Product/Create")
            await self.page.wait_for_load_state('networkidle')

            # Verify we're on the right page
            # This selector needs to be verified against actual TPT site
            await self.page.wait_for_selector('form', timeout=self.timeout)

            logger.info("Ready to create new product")
            return True

        except Exception as e:
            logger.error(f"Failed to navigate to new product page: {e}")
            return False


# Note: Actual TPT selectors and workflow need to be verified by examining
# the real TPT website. The selectors above are placeholders.
