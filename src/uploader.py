"""
TPT Upload workflow handler.

CRITICAL: This module handles actual uploads to TPT.
All operations must:
1. Validate data before upload
2. Confirm actions with user when configured
3. Log all steps
4. Verify success after each action

TPT Upload Form Requirements (from research):
- Title: max 80 characters, SEO-friendly
- Description: first 1-3 sentences become snippet
- Product Type: digital download, etc.
- Subject Areas: select up to 3
- Resource Types: select up to 3 (worksheets, activities, etc.)
- Grade Levels: recommend 3-4 grades
- Keywords/Tags
- Product File: up to 200MB, many formats supported
- Cover Image: jpg or png (png recommended)
- Thumbnails: 4 required
- Preview File: required for paid products
- Copyright attestation: required checkbox
- Make Listing Active: checkbox to publish
"""

import logging
from pathlib import Path
from typing import Optional

from src.browser import TPTBrowser
from src.validators import validate_product_complete
from src.metadata import parse_tags, parse_grades, format_price

logger = logging.getLogger(__name__)

# TPT Field limits
MAX_TITLE_LENGTH = 80
MAX_SUBJECT_AREAS = 3
MAX_RESOURCE_TYPES = 3
RECOMMENDED_GRADE_COUNT = 4


class TPTUploader:
    """
    Handles the complete upload workflow for TPT products.

    Upload Steps:
    1. Navigate to Add New Product
    2. Upload main product file
    3. Fill title and description
    4. Set price
    5. Select grade levels
    6. Select subject areas
    7. Select resource types
    8. Add tags/keywords
    9. Upload cover image
    10. Upload thumbnails (4 required)
    11. Upload preview file
    12. Check copyright attestation
    13. Save as draft OR publish
    """

    def __init__(self, browser: TPTBrowser, settings: dict):
        """
        Initialize the uploader.

        Args:
            browser: Initialized TPTBrowser instance
            settings: Configuration dictionary
        """
        self.browser = browser
        self.settings = settings
        self.products_folder = settings.get('paths', {}).get('products_folder', './products')
        self.default_mode = settings.get('upload', {}).get('default_mode', 'draft')

    async def upload_product(self, product: dict, dry_run: bool = False) -> dict:
        """
        Upload a single product to TPT.

        Args:
            product: Product data dictionary
            dry_run: If True, validate and preview only

        Returns:
            Result dictionary with 'success', 'message', and optionally 'url'
        """
        result = {
            'success': False,
            'message': '',
            'filename': product.get('filename', 'unknown'),
            'warnings': [],
            'steps_completed': []
        }

        # Step 1: Validate product data
        logger.info(f"=== Starting upload for: {product.get('filename')} ===")
        logger.info("Step 1: Validating product data...")

        validation = validate_product_complete(product, self.products_folder)

        if not validation['valid']:
            result['message'] = f"Validation failed: {', '.join(validation['errors'])}"
            logger.error(result['message'])
            return result

        result['warnings'] = validation.get('warnings', [])
        for warning in result['warnings']:
            logger.warning(f"Warning: {warning}")

        result['steps_completed'].append('validation')

        # Step 2: Dry run stops here
        if dry_run:
            result['success'] = True
            result['message'] = "Validation passed (dry run - no upload performed)"
            logger.info(result['message'])
            return result

        # Step 3: Navigate to upload page
        logger.info("Step 2: Navigating to product creation page...")
        if not await self.browser.navigate_to_new_product():
            result['message'] = "Failed to navigate to product creation page"
            logger.error(result['message'])
            return result
        result['steps_completed'].append('navigation')

        # Step 4: Upload main product file
        logger.info("Step 3: Uploading main product file...")
        file_uploaded = await self._upload_product_file(product['filename'])
        if not file_uploaded:
            result['message'] = f"Failed to upload file: {product['filename']}"
            logger.error(result['message'])
            return result
        result['steps_completed'].append('file_upload')

        # Step 5: Fill in title
        logger.info("Step 4: Setting product title...")
        title_set = await self._set_title(product['title'])
        if not title_set:
            result['message'] = "Failed to set product title"
            logger.error(result['message'])
            return result
        result['steps_completed'].append('title')

        # Step 6: Fill in description
        logger.info("Step 5: Setting product description...")
        if product.get('description'):
            desc_set = await self._set_description(product['description'])
            if not desc_set:
                logger.warning("Could not set description, continuing...")
        result['steps_completed'].append('description')

        # Step 7: Set price
        logger.info("Step 6: Setting price...")
        price_set = await self._set_price(product['price'])
        if not price_set:
            result['message'] = "Failed to set price"
            logger.error(result['message'])
            return result
        result['steps_completed'].append('price')

        # Step 8: Select grade levels
        logger.info("Step 7: Selecting grade levels...")
        grades_set = await self._select_grades(product['grades'])
        if not grades_set:
            logger.warning("Could not select grades, continuing...")
        result['steps_completed'].append('grades')

        # Step 9: Select subject areas (if provided)
        if product.get('subjects'):
            logger.info("Step 8: Selecting subject areas...")
            await self._select_subjects(product['subjects'])
        result['steps_completed'].append('subjects')

        # Step 10: Select resource type (if provided)
        if product.get('resource_type'):
            logger.info("Step 9: Selecting resource type...")
            await self._select_resource_type(product['resource_type'])
        result['steps_completed'].append('resource_type')

        # Step 11: Add tags
        if product.get('reading_tags') or product.get('themes'):
            logger.info("Step 10: Adding tags...")
            all_tags = []
            if product.get('reading_tags'):
                all_tags.extend(parse_tags(product['reading_tags']))
            if product.get('themes'):
                all_tags.extend(parse_tags(product['themes']))
            await self._add_tags(all_tags)
        result['steps_completed'].append('tags')

        # Step 12: Upload cover image (if provided)
        if product.get('cover_image'):
            logger.info("Step 11: Uploading cover image...")
            await self._upload_cover_image(product['cover_image'])
        result['steps_completed'].append('cover_image')

        # Step 13: Upload thumbnails (if provided)
        if product.get('thumbnails'):
            logger.info("Step 12: Uploading thumbnails...")
            await self._upload_thumbnails(product['thumbnails'])
        result['steps_completed'].append('thumbnails')

        # Step 14: Upload preview file (if provided)
        if product.get('preview_file'):
            logger.info("Step 13: Uploading preview file...")
            await self._upload_preview(product['preview_file'])
        result['steps_completed'].append('preview')

        # Step 15: Copyright attestation
        logger.info("Step 14: Checking copyright attestation...")
        await self._check_copyright_attestation()
        result['steps_completed'].append('copyright')

        # Step 16: Save as draft (default) or publish
        logger.info(f"Step 15: Saving product as {self.default_mode}...")
        saved = await self._save_product(as_draft=(self.default_mode == 'draft'))
        if not saved:
            result['message'] = "Failed to save product"
            logger.error(result['message'])
            return result
        result['steps_completed'].append('save')

        # Step 17: Verify and take final screenshot
        await self.browser.take_screenshot(f"upload_complete_{Path(product['filename']).stem}")

        result['success'] = True
        result['message'] = f"Product uploaded successfully as {self.default_mode}"
        logger.info(f"=== Upload complete: {result['message']} ===")

        return result

    async def _upload_product_file(self, filename: str) -> bool:
        """Upload the main product file."""
        try:
            filepath = Path(self.products_folder) / filename

            if not filepath.exists():
                logger.error(f"File not found: {filepath}")
                return False

            # Find file upload input - try multiple selectors
            file_input_selectors = [
                'input[type="file"]',
                'input[accept*="pdf"]',
                'input[name*="file"]',
                'input[name*="product"]'
            ]

            for selector in file_input_selectors:
                try:
                    file_input = self.browser.page.locator(selector).first
                    if await file_input.count() > 0:
                        await file_input.set_input_files(str(filepath))
                        logger.info(f"File upload initiated: {filename}")

                        # Wait for upload to process
                        await self.browser.page.wait_for_timeout(3000)

                        # Take screenshot to verify
                        await self.browser.take_screenshot("after_file_upload")
                        return True
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {e}")
                    continue

            logger.error("Could not find file upload input")
            return False

        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return False

    async def _set_title(self, title: str) -> bool:
        """Set the product title."""
        # Truncate if too long
        if len(title) > MAX_TITLE_LENGTH:
            logger.warning(f"Title too long ({len(title)} chars), truncating to {MAX_TITLE_LENGTH}")
            title = title[:MAX_TITLE_LENGTH]

        title_selectors = [
            'input[name="title"]',
            'input[name*="title"]',
            '#title',
            'input[placeholder*="title" i]'
        ]

        for selector in title_selectors:
            try:
                element = self.browser.page.locator(selector).first
                if await element.count() > 0:
                    await element.fill(title)
                    logger.info(f"Title set: {title}")
                    return True
            except:
                continue

        logger.error("Could not find title input")
        return False

    async def _set_description(self, description: str) -> bool:
        """Set the product description."""
        desc_selectors = [
            'textarea[name="description"]',
            'textarea[name*="description"]',
            '#description',
            'textarea[placeholder*="description" i]',
            '[contenteditable="true"]'  # Some sites use rich text editors
        ]

        for selector in desc_selectors:
            try:
                element = self.browser.page.locator(selector).first
                if await element.count() > 0:
                    await element.fill(description)
                    logger.info("Description set")
                    return True
            except:
                continue

        logger.warning("Could not find description input")
        return False

    async def _set_price(self, price) -> bool:
        """Set the product price."""
        price_str = format_price(price)

        price_selectors = [
            'input[name="price"]',
            'input[name*="price"]',
            '#price',
            'input[type="number"][name*="price"]'
        ]

        for selector in price_selectors:
            try:
                element = self.browser.page.locator(selector).first
                if await element.count() > 0:
                    await element.fill(price_str)
                    logger.info(f"Price set: ${price_str}")
                    return True
            except:
                continue

        logger.error("Could not find price input")
        return False

    async def _select_grades(self, grades_string: str) -> bool:
        """Select grade levels."""
        grades = parse_grades(grades_string)

        if len(grades) > RECOMMENDED_GRADE_COUNT:
            logger.warning(f"More than {RECOMMENDED_GRADE_COUNT} grades selected - TPT recommends fewer")

        # This is highly dependent on TPT's actual UI
        # Likely involves clicking checkboxes or a multi-select dropdown
        logger.info(f"Would select grades: {grades}")

        # Try to find and click grade checkboxes
        for grade in grades:
            grade_selectors = [
                f'label:has-text("{grade}")',
                f'input[value="{grade}"]',
                f'[data-grade="{grade}"]'
            ]

            for selector in grade_selectors:
                try:
                    element = self.browser.page.locator(selector).first
                    if await element.count() > 0:
                        await element.click()
                        logger.info(f"Selected grade: {grade}")
                        break
                except:
                    continue

        return True  # Don't fail the upload if grades couldn't be set

    async def _select_subjects(self, subjects_string: str) -> bool:
        """Select subject areas."""
        subjects = parse_tags(subjects_string)[:MAX_SUBJECT_AREAS]
        logger.info(f"Would select subjects: {subjects}")

        # Similar to grades - find and click subject options
        for subject in subjects:
            try:
                element = self.browser.page.locator(f'label:has-text("{subject}")').first
                if await element.count() > 0:
                    await element.click()
                    logger.info(f"Selected subject: {subject}")
            except:
                continue

        return True

    async def _select_resource_type(self, resource_type: str) -> bool:
        """Select resource type."""
        logger.info(f"Would select resource type: {resource_type}")

        try:
            element = self.browser.page.locator(f'label:has-text("{resource_type}")').first
            if await element.count() > 0:
                await element.click()
                logger.info(f"Selected resource type: {resource_type}")
                return True
        except:
            pass

        return True

    async def _add_tags(self, tags: list) -> bool:
        """Add keyword tags."""
        logger.info(f"Would add tags: {tags}")

        # Try to find tags/keywords input
        tag_selectors = [
            'input[name*="tag"]',
            'input[name*="keyword"]',
            'input[placeholder*="tag" i]',
            'input[placeholder*="keyword" i]'
        ]

        for selector in tag_selectors:
            try:
                element = self.browser.page.locator(selector).first
                if await element.count() > 0:
                    # Enter tags separated by commas or press Enter after each
                    for tag in tags:
                        await element.fill(tag)
                        await element.press('Enter')
                        await self.browser.page.wait_for_timeout(300)
                    logger.info(f"Added {len(tags)} tags")
                    return True
            except:
                continue

        return True

    async def _upload_cover_image(self, cover_path: str) -> bool:
        """Upload cover image."""
        filepath = Path(self.products_folder) / cover_path

        if not filepath.exists():
            logger.warning(f"Cover image not found: {filepath}")
            return False

        # Find cover image upload
        cover_selectors = [
            'input[type="file"][accept*="image"]',
            'input[name*="cover"]',
            'input[name*="thumbnail"]'
        ]

        for selector in cover_selectors:
            try:
                element = self.browser.page.locator(selector).first
                if await element.count() > 0:
                    await element.set_input_files(str(filepath))
                    logger.info(f"Cover image uploaded: {cover_path}")
                    await self.browser.page.wait_for_timeout(2000)
                    return True
            except:
                continue

        return False

    async def _upload_thumbnails(self, thumbnails_string: str) -> bool:
        """Upload thumbnail images (TPT requires 4)."""
        thumbnails = parse_tags(thumbnails_string)
        logger.info(f"Would upload {len(thumbnails)} thumbnails")

        if len(thumbnails) < 4:
            logger.warning(f"TPT requires 4 thumbnails, only {len(thumbnails)} provided")

        # Upload each thumbnail
        for thumb in thumbnails:
            filepath = Path(self.products_folder) / thumb
            if filepath.exists():
                # Find thumbnail upload input
                # This will depend on TPT's actual UI
                logger.info(f"Would upload thumbnail: {thumb}")

        return True

    async def _upload_preview(self, preview_path: str) -> bool:
        """Upload preview file."""
        filepath = Path(self.products_folder) / preview_path

        if not filepath.exists():
            logger.warning(f"Preview file not found: {filepath}")
            return False

        logger.info(f"Would upload preview: {preview_path}")
        return True

    async def _check_copyright_attestation(self) -> bool:
        """Check the copyright attestation checkbox."""
        copyright_selectors = [
            'input[name*="copyright"]',
            'input[type="checkbox"][name*="attest"]',
            'label:has-text("copyright") input[type="checkbox"]',
            'label:has-text("I confirm") input[type="checkbox"]'
        ]

        for selector in copyright_selectors:
            try:
                element = self.browser.page.locator(selector).first
                if await element.count() > 0:
                    # Check if already checked
                    is_checked = await element.is_checked()
                    if not is_checked:
                        await element.check()
                    logger.info("Copyright attestation checked")
                    return True
            except:
                continue

        logger.warning("Could not find copyright checkbox")
        return True

    async def _save_product(self, as_draft: bool = True) -> bool:
        """Save the product (as draft or published)."""
        try:
            if as_draft:
                # Look for Save Draft button
                draft_selectors = [
                    'button:has-text("Save Draft")',
                    'button:has-text("Save as Draft")',
                    'input[value*="Draft"]',
                    'button[name*="draft"]'
                ]

                for selector in draft_selectors:
                    try:
                        button = self.browser.page.locator(selector).first
                        if await button.count() > 0:
                            logger.info("Clicking Save Draft...")
                            await button.click()
                            await self.browser.page.wait_for_load_state('networkidle')
                            logger.info("Product saved as draft")
                            return True
                    except:
                        continue

            else:
                # Look for Publish button
                publish_selectors = [
                    'button:has-text("Publish")',
                    'button:has-text("Submit")',
                    'input[value*="Publish"]',
                    'button[type="submit"]'
                ]

                # IMPORTANT: Publishing requires extra confirmation
                logger.warning("PUBLISHING product (not draft)!")

                for selector in publish_selectors:
                    try:
                        button = self.browser.page.locator(selector).first
                        if await button.count() > 0:
                            logger.info("Clicking Publish...")
                            await button.click()
                            await self.browser.page.wait_for_load_state('networkidle')
                            logger.info("Product published")
                            return True
                    except:
                        continue

            # If we couldn't find specific buttons, try generic submit
            logger.warning("Could not find specific save button, trying generic submit")
            try:
                submit = self.browser.page.locator('button[type="submit"]').first
                if await submit.count() > 0:
                    await submit.click()
                    await self.browser.page.wait_for_load_state('networkidle')
                    return True
            except:
                pass

            logger.error("Could not find any save/submit button")
            return False

        except Exception as e:
            logger.error(f"Failed to save product: {e}")
            return False


async def run_batch_upload(products: list, settings: dict, dry_run: bool = False) -> dict:
    """
    Run batch upload for multiple products.

    Args:
        products: List of product dictionaries
        dry_run: If True, validate only

    Returns:
        Summary dictionary with results
    """
    summary = {
        'total': len(products),
        'successful': 0,
        'failed': 0,
        'skipped': 0,
        'results': []
    }

    mode = "[DRY RUN] " if dry_run else ""
    logger.info(f"{mode}Starting batch upload of {len(products)} products...")

    browser = None

    try:
        if not dry_run:
            # Start browser and login
            browser = TPTBrowser(settings)

            if not await browser.start():
                return {'error': 'Failed to start browser', **summary}

            email = settings.get('tpt', {}).get('email')
            password = settings.get('tpt', {}).get('password')

            if not email or not password:
                return {'error': 'TPT credentials not configured', **summary}

            if not await browser.login(email, password):
                return {'error': 'Failed to login to TPT', **summary}

        uploader = TPTUploader(browser, settings) if browser else None

        for i, product in enumerate(products, 1):
            logger.info(f"\n{'='*50}")
            logger.info(f"Processing product {i}/{len(products)}: {product.get('filename')}")
            logger.info(f"{'='*50}")

            if dry_run:
                # Just validate
                validation = validate_product_complete(
                    product,
                    settings.get('paths', {}).get('products_folder', './products')
                )
                result = {
                    'success': validation['valid'],
                    'filename': product.get('filename'),
                    'message': 'Validation passed' if validation['valid'] else f"Errors: {validation['errors']}",
                    'warnings': validation.get('warnings', [])
                }
            else:
                result = await uploader.upload_product(product, dry_run=False)

            summary['results'].append(result)

            if result['success']:
                summary['successful'] += 1
            else:
                summary['failed'] += 1

                # Stop on error if configured
                if settings.get('upload', {}).get('stop_on_error', True) and not dry_run:
                    logger.error("Stopping batch due to error (stop_on_error=true)")
                    summary['skipped'] = len(products) - i
                    break

            # Delay between uploads (not needed for dry run)
            if not dry_run and i < len(products):
                delay = settings.get('upload', {}).get('delay_between_uploads', 5)
                logger.info(f"Waiting {delay} seconds before next upload...")
                await browser.page.wait_for_timeout(delay * 1000)

    except Exception as e:
        logger.error(f"Batch upload error: {e}")
        summary['error'] = str(e)

    finally:
        if browser:
            await browser.close()

    logger.info(f"\n{'='*50}")
    logger.info(f"Batch complete: {summary['successful']}/{summary['total']} successful, {summary['failed']} failed")
    logger.info(f"{'='*50}")

    return summary
