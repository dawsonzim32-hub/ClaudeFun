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

# Use persistent browser profile to save login session
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "browser_data")


# =============================================================================
# UPLOAD LOGIC
# =============================================================================

async def check_if_logged_in(page):
    """Check if already logged in to TPT."""
    print("Checking if already logged in...")
    await page.goto("https://www.teacherspayteachers.com/My-Products")
    await asyncio.sleep(3)

    current_url = page.url.lower()
    if "login" in current_url or "signin" in current_url:
        return False
    return True


async def login_to_tpt(page):
    """Ensure user is logged in - let them do it manually."""

    # First check if already logged in (from previous session)
    if await check_if_logged_in(page):
        print("Already logged in from previous session!")
        return True

    # Not logged in - prompt user to log in manually
    print("\n" + "="*60)
    print("MANUAL LOGIN REQUIRED")
    print("="*60)
    print("The browser window is open. Please:")
    print("  1. Log in to TPT manually")
    print("  2. Complete any 2FA verification")
    print("  3. Once you see your dashboard, come back here")
    print("\nWaiting for you to log in (up to 10 minutes)...")
    print("="*60 + "\n")

    # Go to login page
    await page.goto("https://www.teacherspayteachers.com/Login")
    await asyncio.sleep(2)

    # Wait for user to complete login
    for i in range(600):
        await asyncio.sleep(1)
        current_url = page.url.lower()

        # Check if we're past login
        if "login" not in current_url and "signin" not in current_url and "verify" not in current_url:
            print(f"\nLogin detected! You're now at: {page.url}")
            break

        if i % 30 == 29:
            print(f"  Still waiting for login... ({(i+1)//60} min {(i+1)%60} sec)")

    # Verify login worked
    current_url = page.url.lower()
    if "login" in current_url or "signin" in current_url:
        print("Login timed out.")
        return False

    print("Login successful! Your session is saved for next time.")
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

    # Start browser with persistent profile (saves login session)
    print("\nStarting browser (using saved profile for login)...")
    print(f"Profile location: {USER_DATA_DIR}")
    async with async_playwright() as p:
        # Use persistent context - this saves cookies/login between runs
        context = await p.chromium.launch_persistent_context(
            USER_DATA_DIR,
            headless=HEADLESS,
            args=['--disable-blink-features=AutomationControlled']
        )
        page = context.pages[0] if context.pages else await context.new_page()

        # Login
        if not await login_to_tpt(page):
            print("Login failed. Exiting.")
            await context.close()
            return

        print("\n*** LOGIN SUCCESSFUL - Starting upload process ***\n")

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
                import traceback
                traceback.print_exc()
                failed += 1

            # Delay between uploads
            if i < len(products):
                print(f"Waiting {DELAY_BETWEEN_UPLOADS} seconds...")
                await asyncio.sleep(DELAY_BETWEEN_UPLOADS)

        print(f"\n{'='*60}")
        print(f"COMPLETE: {successful} successful, {failed} failed")
        print(f"{'='*60}")

        await context.close()


if __name__ == "__main__":
    asyncio.run(main())
