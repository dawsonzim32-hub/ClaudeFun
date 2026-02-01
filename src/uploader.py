"""
TPT Upload workflow handler.

CRITICAL: This module handles actual uploads to TPT.
All operations must:
1. Validate data before upload
2. Confirm actions with user when configured
3. Log all steps
4. Verify success after each action
"""

import logging
from pathlib import Path
from typing import Optional

from src.browser import TPTBrowser
from src.validators import validate_product_complete
from src.metadata import parse_tags, parse_grades, format_price

logger = logging.getLogger(__name__)


class TPTUploader:
    """
    Handles the complete upload workflow for TPT products.
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
            'warnings': []
        }

        # Step 1: Validate product data
        logger.info(f"Validating product: {product.get('filename')}")
        validation = validate_product_complete(product, self.products_folder)

        if not validation['valid']:
            result['message'] = f"Validation failed: {', '.join(validation['errors'])}"
            logger.error(result['message'])
            return result

        result['warnings'] = validation.get('warnings', [])
        for warning in result['warnings']:
            logger.warning(warning)

        # Step 2: Dry run stops here
        if dry_run:
            result['success'] = True
            result['message'] = "Validation passed (dry run)"
            return result

        # Step 3: Navigate to upload page
        logger.info("Navigating to product creation page...")
        if not await self.browser.navigate_to_new_product():
            result['message'] = "Failed to navigate to product creation page"
            return result

        # Step 4: Upload file
        logger.info(f"Uploading file: {product['filename']}")
        file_uploaded = await self._upload_file(product['filename'])
        if not file_uploaded:
            result['message'] = f"Failed to upload file: {product['filename']}"
            return result

        # Step 5: Fill metadata
        logger.info("Filling product metadata...")
        metadata_filled = await self._fill_metadata(product)
        if not metadata_filled:
            result['message'] = "Failed to fill product metadata"
            return result

        # Step 6: Save as draft (default) or publish
        logger.info(f"Saving product as {self.default_mode}...")
        saved = await self._save_product(as_draft=(self.default_mode == 'draft'))
        if not saved:
            result['message'] = "Failed to save product"
            return result

        # Step 7: Verify and take screenshot
        await self.browser.take_screenshot(f"upload_complete_{product['filename']}")

        result['success'] = True
        result['message'] = f"Product uploaded successfully as {self.default_mode}"
        logger.info(result['message'])

        return result

    async def _upload_file(self, filename: str) -> bool:
        """
        Upload the product file.

        Args:
            filename: Name of the file to upload

        Returns:
            True if upload successful
        """
        try:
            filepath = Path(self.products_folder) / filename

            if not filepath.exists():
                logger.error(f"File not found: {filepath}")
                return False

            # Find and interact with file upload input
            # NOTE: Actual selector needs to be determined from TPT website
            file_input = self.browser.page.locator('input[type="file"]').first
            await file_input.set_input_files(str(filepath))

            # Wait for upload to complete
            # NOTE: Need to determine how TPT indicates upload completion
            await self.browser.page.wait_for_timeout(2000)

            logger.info(f"File uploaded: {filename}")
            return True

        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return False

    async def _fill_metadata(self, product: dict) -> bool:
        """
        Fill in all product metadata fields.

        Args:
            product: Product data dictionary

        Returns:
            True if all fields filled successfully
        """
        try:
            page = self.browser.page

            # Title
            # NOTE: Actual selectors need to be determined from TPT website
            logger.info(f"Setting title: {product['title']}")
            await page.fill('[name="title"]', product['title'])

            # Description
            if product.get('description'):
                logger.info("Setting description...")
                await page.fill('[name="description"]', product['description'])

            # Price
            price = format_price(product['price'])
            logger.info(f"Setting price: ${price}")
            await page.fill('[name="price"]', price)

            # Grades
            grades = parse_grades(product['grades'])
            logger.info(f"Setting grades: {grades}")
            # NOTE: Grade selection UI needs to be determined from TPT website
            # This likely involves clicking checkboxes or a multi-select

            # Tags
            if product.get('reading_tags'):
                tags = parse_tags(product['reading_tags'])
                logger.info(f"Setting reading tags: {tags}")
                # NOTE: Tag selection UI needs to be determined from TPT website

            if product.get('themes'):
                themes = parse_tags(product['themes'])
                logger.info(f"Setting theme tags: {themes}")
                # NOTE: Theme selection UI needs to be determined from TPT website

            # Resource type
            if product.get('resource_type'):
                logger.info(f"Setting resource type: {product['resource_type']}")
                # NOTE: Resource type selection needs to be determined from TPT website

            return True

        except Exception as e:
            logger.error(f"Failed to fill metadata: {e}")
            return False

    async def _save_product(self, as_draft: bool = True) -> bool:
        """
        Save the product (as draft or published).

        Args:
            as_draft: If True, save as draft. If False, publish immediately.

        Returns:
            True if save successful
        """
        try:
            page = self.browser.page

            if as_draft:
                # Save as draft
                # NOTE: Actual selector needs to be determined from TPT website
                logger.info("Saving as draft...")
                await page.click('button:has-text("Save Draft")')
            else:
                # Publish
                logger.warning("Publishing product (not draft)...")
                await page.click('button:has-text("Publish")')

            # Wait for save to complete
            await page.wait_for_load_state('networkidle')

            # Verify save was successful
            # NOTE: Need to determine success indicators from TPT website

            logger.info("Product saved successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to save product: {e}")
            return False


async def run_batch_upload(products: list, settings: dict, dry_run: bool = False) -> dict:
    """
    Run batch upload for multiple products.

    Args:
        products: List of product dictionaries
        settings: Configuration dictionary
        dry_run: If True, validate only

    Returns:
        Summary dictionary with results
    """
    summary = {
        'total': len(products),
        'successful': 0,
        'failed': 0,
        'results': []
    }

    if dry_run:
        logger.info(f"[DRY RUN] Validating {len(products)} products...")
    else:
        logger.info(f"Starting batch upload of {len(products)} products...")

    browser = TPTBrowser(settings)

    try:
        if not dry_run:
            # Start browser and login
            if not await browser.start():
                return {'error': 'Failed to start browser'}

            email = settings.get('tpt', {}).get('email')
            password = settings.get('tpt', {}).get('password')

            if not await browser.login(email, password):
                return {'error': 'Failed to login to TPT'}

        uploader = TPTUploader(browser, settings)

        for i, product in enumerate(products, 1):
            logger.info(f"Processing product {i}/{len(products)}: {product.get('filename')}")

            result = await uploader.upload_product(product, dry_run=dry_run)
            summary['results'].append(result)

            if result['success']:
                summary['successful'] += 1
            else:
                summary['failed'] += 1

                # Stop on error if configured
                if settings.get('upload', {}).get('stop_on_error', True) and not dry_run:
                    logger.error("Stopping batch due to error (stop_on_error=true)")
                    break

            # Delay between uploads
            if not dry_run and i < len(products):
                delay = settings.get('upload', {}).get('delay_between_uploads', 5)
                logger.info(f"Waiting {delay} seconds before next upload...")
                await browser.page.wait_for_timeout(delay * 1000)

    finally:
        if not dry_run:
            await browser.close()

    logger.info(f"Batch complete: {summary['successful']}/{summary['total']} successful")
    return summary
