#!/usr/bin/env python3
"""
TPT Bulk Uploader - Simple Version
Run this script to upload your products to Teachers Pay Teachers.

Usage:
    python tpt_upload.py --dry-run          # Test without uploading
    python tpt_upload.py --product 41       # Upload just product #41
    python tpt_upload.py                    # Upload all products
"""

import asyncio
import csv
import os
import sys
from pathlib import Path

# Try to import playwright
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Playwright not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(1)

# =============================================================================
# CONFIGURATION - Edit these paths if needed
# =============================================================================
PDF_FOLDER = r"C:\Users\DZimmerman\Downloads\not_boring_media_100_products\upload_ready"
CSV_FILE = os.path.join(os.path.dirname(__file__), "products.csv")

# TPT Credentials
TPT_EMAIL = "dzimmerman@wesleyanschool.org"
TPT_PASSWORD = "9704418dz"

# Settings
SAVE_AS_DRAFT = True  # True = save as draft, False = publish immediately
HEADLESS = False  # False = show browser window, True = run invisibly
DELAY_BETWEEN_UPLOADS = 3  # seconds between each upload


# =============================================================================
# UPLOAD LOGIC
# =============================================================================

async def login_to_tpt(page):
    """Log into TPT using Playwright's getByPlaceholder."""
    print("Navigating to TPT login...")
    await page.goto("https://www.teacherspayteachers.com/Login")

    # Wait for page to fully load
    print("Waiting for page to load...")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Take screenshot
    await page.screenshot(path="login_page.png")
    print("Screenshot saved as login_page.png")

    # Use Playwright's getByPlaceholder - the recommended modern approach
    print("Looking for email field by placeholder...")
    try:
        email_field = page.get_by_placeholder("Email or username")
        await email_field.wait_for(state="visible", timeout=10000)
        print("Found email field! Clicking and typing...")
        await email_field.click()
        await asyncio.sleep(0.3)
        await email_field.fill(TPT_EMAIL)
        print(f"Email entered: {TPT_EMAIL}")
    except Exception as e:
        print(f"Could not find email field: {e}")
        # Fallback: try to find any visible input
        print("Trying fallback: clicking first input...")
        inputs = await page.query_selector_all('input')
        print(f"Found {len(inputs)} input elements")
        for i, inp in enumerate(inputs):
            try:
                placeholder = await inp.get_attribute('placeholder')
                inp_type = await inp.get_attribute('type')
                print(f"  Input {i}: type={inp_type}, placeholder={placeholder}")
            except:
                pass
        return False

    print("Looking for password field...")
    try:
        password_field = page.get_by_placeholder("Password")
        await password_field.click()
        await asyncio.sleep(0.3)
        await password_field.fill(TPT_PASSWORD)
        print("Password entered")
    except Exception as e:
        print(f"Could not find password field: {e}")
        return False

    # Take screenshot before submitting
    await page.screenshot(path="before_submit.png")
    print("Screenshot saved as before_submit.png")

    # Click login button
    print("Looking for Log in button...")
    try:
        login_button = page.get_by_role("button", name="Log in")
        await login_button.click()
        print("Clicked Log in button")
    except Exception as e:
        print(f"Could not find button by role, trying text: {e}")
        try:
            await page.click('button:has-text("Log in")')
            print("Clicked button by text")
        except:
            print("Pressing Enter as fallback...")
            await page.keyboard.press('Enter')

    # Wait for navigation
    print("Waiting for login to complete...")
    await asyncio.sleep(5)
    await page.screenshot(path="after_login.png")
    print("Screenshot saved as after_login.png")

    # Check if login succeeded
    current_url = page.url.lower()
    if "login" in current_url or "signin" in current_url:
        print(f"WARNING: Still on login page. URL: {page.url}")
        print("Login may have failed. Check credentials or CAPTCHA.")
        return False

    print("Login successful!")
    return True


async def upload_product(page, product, pdf_folder):
    """Upload a single product to TPT."""
    filename = product['filename']
    title = product['title']
    description = product['description']
    price = product['price']
    grades = product['grades']

    print(f"\n{'='*60}")
    print(f"Uploading: {title[:50]}...")
    print(f"{'='*60}")

    # Navigate to new product page
    print("Step 1: Going to product creation page...")
    await page.goto("https://www.teacherspayteachers.com/My-Products/add")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Take screenshot for debugging
    await page.screenshot(path=f"screenshot_{filename.replace('.pdf', '')}.png")

    # Upload the PDF file
    print("Step 2: Uploading PDF file...")
    pdf_path = os.path.join(pdf_folder, filename)
    if not os.path.exists(pdf_path):
        print(f"ERROR: File not found: {pdf_path}")
        return False

    # Find file input and upload
    file_inputs = page.locator('input[type="file"]')
    count = await file_inputs.count()
    if count > 0:
        await file_inputs.first.set_input_files(pdf_path)
        print(f"   Uploaded: {filename}")
        await asyncio.sleep(3)  # Wait for upload to process
    else:
        print("WARNING: Could not find file upload input")

    # Fill in title
    print("Step 3: Setting title...")
    title_input = page.locator('input[name="title"], input[name*="title"], #title').first
    if await title_input.count() > 0:
        await title_input.fill(title[:80])  # TPT max is 80 chars
        print(f"   Title set: {title[:50]}...")

    # Fill in description
    print("Step 4: Setting description...")
    desc_input = page.locator('textarea[name="description"], textarea[name*="description"], #description').first
    if await desc_input.count() > 0:
        await desc_input.fill(description)
        print("   Description set")

    # Set price
    print("Step 5: Setting price...")
    price_input = page.locator('input[name="price"], input[name*="price"], #price').first
    if await price_input.count() > 0:
        await price_input.fill(str(price))
        print(f"   Price set: ${price}")

    # Try to select grade levels
    print("Step 6: Selecting grades...")
    grade_range = grades.split('-')
    if len(grade_range) == 2:
        for g in range(int(grade_range[0]), int(grade_range[1]) + 1):
            grade_label = page.locator(f'label:has-text("Grade {g}"), label:has-text("{g}th Grade")').first
            if await grade_label.count() > 0:
                await grade_label.click()
                print(f"   Selected grade {g}")

    # Take screenshot before saving
    await page.screenshot(path=f"before_save_{filename.replace('.pdf', '')}.png")

    # Save as draft
    if SAVE_AS_DRAFT:
        print("Step 7: Saving as draft...")
        draft_btn = page.locator('button:has-text("Save Draft"), button:has-text("Save as Draft")').first
        if await draft_btn.count() > 0:
            await draft_btn.click()
            await asyncio.sleep(2)
            print("   Saved as draft!")
        else:
            print("WARNING: Could not find Save Draft button")

    print(f"Completed: {filename}")
    return True


async def main():
    """Main function."""
    import argparse
    parser = argparse.ArgumentParser(description='TPT Bulk Uploader')
    parser.add_argument('--dry-run', action='store_true', help='Validate without uploading')
    parser.add_argument('--product', type=int, help='Upload only this product number (e.g., 41)')
    args = parser.parse_args()

    # Load products from CSV
    print("Loading products from CSV...")
    if not os.path.exists(CSV_FILE):
        print(f"ERROR: CSV file not found: {CSV_FILE}")
        print("Make sure products.csv is in the same folder as this script.")
        sys.exit(1)

    products = []
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append(row)

    print(f"Loaded {len(products)} products")

    # Filter to specific product if requested
    if args.product:
        products = [p for p in products if p['filename'].startswith(f"{args.product:03d}_")]
        if not products:
            print(f"ERROR: Product #{args.product} not found")
            sys.exit(1)
        print(f"Filtered to product #{args.product}: {products[0]['filename']}")

    # Validate files exist
    print("\nValidating files...")
    missing = []
    for p in products:
        pdf_path = os.path.join(PDF_FOLDER, p['filename'])
        if not os.path.exists(pdf_path):
            missing.append(p['filename'])

    if missing:
        print(f"ERROR: {len(missing)} files not found:")
        for m in missing[:5]:
            print(f"  - {m}")
        if len(missing) > 5:
            print(f"  ... and {len(missing) - 5} more")
        sys.exit(1)

    print(f"All {len(products)} files validated!")

    # Dry run stops here
    if args.dry_run:
        print("\n[DRY RUN] Validation complete. No uploads performed.")
        print("\nTo upload for real, run without --dry-run flag:")
        print("  python tpt_upload.py")
        print("  python tpt_upload.py --product 41")
        return

    # Start browser and upload
    print("\nStarting browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=HEADLESS)
        context = await browser.new_context()
        page = await context.new_page()

        # Login
        if not await login_to_tpt(page):
            print("Login failed. Exiting.")
            await browser.close()
            return

        # Upload each product
        successful = 0
        failed = 0

        for i, product in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}] Processing {product['filename']}...")

            try:
                result = await upload_product(page, product, PDF_FOLDER)
                if result:
                    successful += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"ERROR uploading {product['filename']}: {e}")
                failed += 1

            # Delay between uploads
            if i < len(products):
                print(f"Waiting {DELAY_BETWEEN_UPLOADS} seconds...")
                await asyncio.sleep(DELAY_BETWEEN_UPLOADS)

        print(f"\n{'='*60}")
        print(f"COMPLETE: {successful} successful, {failed} failed")
        print(f"{'='*60}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
