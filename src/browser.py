"""
Browser automation for TPT interactions.
Uses Playwright for reliable browser control.

TPT Website Structure (based on research):
- Login: https://www.teacherspayteachers.com/Login
- Dashboard: User menu > Dashboard
- Add Product: Dashboard > "Add New Product" button

Form Fields:
- Title (max 80 chars)
- Description
- Product Type
- Subject Areas (select up to 3)
- Resource Types (select up to 3)
- Grade Levels (recommend 3-4)
- Keywords/Tags
- File upload (200MB max)
- Cover image (jpg/png)
- 4 thumbnail images
- Preview file
- "Make Listing Active" checkbox
- Copyright attestation checkbox
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# TPT URLs
TPT_BASE_URL = "https://www.teacherspayteachers.com"
TPT_LOGIN_URL = f"{TPT_BASE_URL}/Login"
TPT_DASHBOARD_URL = f"{TPT_BASE_URL}/My-Products"
TPT_NEW_PRODUCT_URL = f"{TPT_BASE_URL}/Product/Create"


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
        self.playwright = None
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

            # Create context with reasonable viewport
            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
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
            await self.page.goto(TPT_LOGIN_URL)
            await self.page.wait_for_load_state('networkidle')

            # Take screenshot of login page for debugging
            await self.take_screenshot("login_page")

            # Wait for and fill login form
            # Try multiple possible selectors for email field
            email_selectors = [
                'input[name="email"]',
                'input[type="email"]',
                '#email',
                'input[placeholder*="email" i]'
            ]

            email_input = None
            for selector in email_selectors:
                try:
                    email_input = self.page.locator(selector).first
                    if await email_input.count() > 0:
                        logger.info(f"Found email input with selector: {selector}")
                        break
                except:
                    continue

            if not email_input or await email_input.count() == 0:
                logger.error("Could not find email input field")
                await self.take_screenshot("login_error_no_email_field")
                return False

            # Fill in credentials
            logger.info("Entering email...")
            await email_input.fill(email)

            # Find password field
            password_selectors = [
                'input[name="password"]',
                'input[type="password"]',
                '#password'
            ]

            password_input = None
            for selector in password_selectors:
                try:
                    password_input = self.page.locator(selector).first
                    if await password_input.count() > 0:
                        logger.info(f"Found password input with selector: {selector}")
                        break
                except:
                    continue

            if not password_input or await password_input.count() == 0:
                logger.error("Could not find password input field")
                await self.take_screenshot("login_error_no_password_field")
                return False

            logger.info("Entering password...")
            await password_input.fill(password)

            # Find and click submit button
            submit_selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Log In")',
                'button:has-text("Sign In")'
            ]

            submit_button = None
            for selector in submit_selectors:
                try:
                    submit_button = self.page.locator(selector).first
                    if await submit_button.count() > 0:
                        logger.info(f"Found submit button with selector: {selector}")
                        break
                except:
                    continue

            if submit_button and await submit_button.count() > 0:
                logger.info("Clicking login button...")
                await submit_button.click()
            else:
                # Try pressing Enter as fallback
                logger.info("No submit button found, pressing Enter...")
                await password_input.press('Enter')

            # Wait for navigation
            await self.page.wait_for_load_state('networkidle')
            await self.page.wait_for_timeout(2000)  # Extra wait for any redirects

            # Verify login success
            logged_in = await self._verify_logged_in()

            if logged_in:
                self.is_logged_in = True
                logger.info("Login successful!")
                await self.take_screenshot("login_success")
                return True
            else:
                logger.error("Login verification failed")
                await self.take_screenshot("login_failed")
                return False

        except Exception as e:
            logger.error(f"Login failed with exception: {e}")
            await self.take_screenshot("login_exception")
            return False

    async def _verify_logged_in(self) -> bool:
        """
        Verify that we're logged in by checking for logged-in indicators.

        Returns:
            True if logged in
        """
        # Indicators that suggest we're logged in
        logged_in_indicators = [
            'text="My Products"',
            'text="Dashboard"',
            'text="My Account"',
            '[href*="/My-Products"]',
            '[href*="/Dashboard"]',
            'text="Seller Dashboard"'
        ]

        for indicator in logged_in_indicators:
            try:
                element = self.page.locator(indicator)
                if await element.count() > 0:
                    logger.info(f"Found logged-in indicator: {indicator}")
                    return True
            except:
                continue

        # Check URL - if we're redirected away from login, probably logged in
        current_url = self.page.url
        if '/Login' not in current_url and TPT_BASE_URL in current_url:
            logger.info(f"URL suggests logged in: {current_url}")
            return True

        return False

    async def navigate_to_dashboard(self) -> bool:
        """
        Navigate to the seller dashboard.

        Returns:
            True if navigation successful
        """
        if not self.is_logged_in:
            logger.error("Must be logged in to access dashboard")
            return False

        try:
            logger.info("Navigating to seller dashboard...")
            await self.page.goto(TPT_DASHBOARD_URL)
            await self.page.wait_for_load_state('networkidle')

            # Verify we're on the dashboard
            await self.page.wait_for_timeout(1000)
            await self.take_screenshot("dashboard")

            logger.info("On seller dashboard")
            return True

        except Exception as e:
            logger.error(f"Failed to navigate to dashboard: {e}")
            return False

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

            # Try direct URL first
            await self.page.goto(TPT_NEW_PRODUCT_URL)
            await self.page.wait_for_load_state('networkidle')
            await self.page.wait_for_timeout(2000)

            # Take screenshot to see what we got
            await self.take_screenshot("new_product_page")

            # Verify we're on the product creation page
            # Look for form elements or product creation indicators
            form_indicators = [
                'input[name="title"]',
                'textarea[name="description"]',
                'text="Add New Product"',
                'text="Product Title"',
                'text="Upload"'
            ]

            for indicator in form_indicators:
                try:
                    element = self.page.locator(indicator)
                    if await element.count() > 0:
                        logger.info(f"Found product form indicator: {indicator}")
                        logger.info("Ready to create new product")
                        return True
                except:
                    continue

            # If direct URL didn't work, try clicking through dashboard
            logger.info("Direct URL may not have worked, trying dashboard route...")
            await self.navigate_to_dashboard()

            # Look for "Add New Product" button
            add_button_selectors = [
                'text="Add New Product"',
                'a:has-text("Add New Product")',
                'button:has-text("Add New Product")',
                '[href*="Product/Create"]'
            ]

            for selector in add_button_selectors:
                try:
                    button = self.page.locator(selector).first
                    if await button.count() > 0:
                        logger.info(f"Found Add New Product button: {selector}")
                        await button.click()
                        await self.page.wait_for_load_state('networkidle')
                        await self.take_screenshot("new_product_after_click")
                        return True
                except:
                    continue

            logger.warning("Could not confirm we're on the product creation page")
            return True  # Continue anyway - let the upload step verify

        except Exception as e:
            logger.error(f"Failed to navigate to new product page: {e}")
            await self.take_screenshot("new_product_error")
            return False

    async def take_screenshot(self, name: str = None) -> Optional[str]:
        """
        Take a screenshot for verification/debugging.

        Args:
            name: Optional name for the screenshot file

        Returns:
            Path to the saved screenshot, or None if failed
        """
        if not self.settings.get('logging', {}).get('save_screenshots', True):
            return None

        try:
            # Create screenshots directory
            screenshots_dir = Path("logs/screenshots")
            screenshots_dir.mkdir(parents=True, exist_ok=True)

            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}.png" if name else f"screenshot_{timestamp}.png"
            filepath = screenshots_dir / filename

            await self.page.screenshot(path=str(filepath), full_page=True)
            logger.info(f"Screenshot saved: {filepath}")

            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to take screenshot: {e}")
            return None

    async def wait_and_click(self, selector: str, description: str = "") -> bool:
        """
        Wait for an element and click it.

        Args:
            selector: CSS selector for the element
            description: Human-readable description for logging

        Returns:
            True if click successful
        """
        try:
            desc = description or selector
            logger.info(f"Waiting for: {desc}")

            element = self.page.locator(selector).first
            await element.wait_for(state='visible', timeout=self.timeout)
            await element.click()

            logger.info(f"Clicked: {desc}")
            return True

        except Exception as e:
            logger.error(f"Failed to click {description or selector}: {e}")
            return False

    async def wait_and_fill(self, selector: str, value: str, description: str = "") -> bool:
        """
        Wait for an input element and fill it.

        Args:
            selector: CSS selector for the input
            value: Value to enter
            description: Human-readable description for logging

        Returns:
            True if fill successful
        """
        try:
            desc = description or selector
            logger.info(f"Filling {desc}...")

            element = self.page.locator(selector).first
            await element.wait_for(state='visible', timeout=self.timeout)
            await element.fill(value)

            logger.info(f"Filled {desc}")
            return True

        except Exception as e:
            logger.error(f"Failed to fill {description or selector}: {e}")
            return False

    async def upload_file(self, selector: str, filepath: str, description: str = "") -> bool:
        """
        Upload a file to a file input element.

        Args:
            selector: CSS selector for the file input
            filepath: Path to the file to upload
            description: Human-readable description for logging

        Returns:
            True if upload initiated successfully
        """
        try:
            desc = description or "file"
            path = Path(filepath)

            if not path.exists():
                logger.error(f"File not found: {filepath}")
                return False

            logger.info(f"Uploading {desc}: {path.name}")

            file_input = self.page.locator(selector).first
            await file_input.set_input_files(str(path))

            # Wait for upload to process
            await self.page.wait_for_timeout(2000)

            logger.info(f"Upload initiated: {desc}")
            return True

        except Exception as e:
            logger.error(f"Failed to upload {description or 'file'}: {e}")
            return False
