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

    # Step 1: Go to My Products page
    print("Step 1: Going to My Products...")
    await page.goto("https://www.teacherspayteachers.com/My-Products")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Step 2: Click "Add New Product" button
    print("Step 2: Clicking Add New Product...")
    await page.screenshot(path="step2_my_products.png")

    add_clicked = False
    add_selectors = [
        'text="Add New Product"',
        'a:has-text("Add New Product")',
        'button:has-text("Add New Product")',
        'text="Add Product"',
        'a:has-text("Add Product")',
        '[href*="add"]',
        'text="New Product"',
    ]

    for selector in add_selectors:
        try:
            element = page.locator(selector).first
            if await element.is_visible(timeout=2000):
                await element.click()
                add_clicked = True
                print(f"   Clicked: {selector}")
                break
        except:
            continue

    if not add_clicked:
        print("ERROR: Could not find Add New Product button")
        await page.screenshot(path="error_add_product.png")
        return False

    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Step 3: Click "Digital Download" button
    print("Step 3: Clicking Digital Download...")
    await page.screenshot(path="step3_product_type.png")

    # Try multiple selectors for the Digital Download option
    clicked = False
    selectors_to_try = [
        'text="Digital Download"',
        'a:has-text("Digital Download")',
        'button:has-text("Digital Download")',
        '[data-testid*="digital"]',
        '.product-type-card:has-text("Digital")',
        'div:has-text("Digital Download") >> visible=true',
        'a[href*="digital"]',
        'text="Digital"',
    ]

    for selector in selectors_to_try:
        try:
            print(f"   Trying selector: {selector}")
            element = page.locator(selector).first
            if await element.is_visible(timeout=2000):
                await element.click()
                clicked = True
                print(f"   SUCCESS: Clicked using {selector}")
                break
        except Exception as e:
            continue

    if not clicked:
        # Last resort: try clicking by coordinates if we can find any clickable card
        try:
            print("   Trying to find any product type card...")
            cards = page.locator('a, button, [role="button"]').filter(has_text="Digital")
            count = await cards.count()
            print(f"   Found {count} elements with 'Digital' text")
            if count > 0:
                await cards.first.click()
                clicked = True
                print("   Clicked first Digital element")
        except Exception as e:
            print(f"   Could not click Digital element: {e}")

    if not clicked:
        print("ERROR: Could not click Digital Download with any selector")
        await page.screenshot(path="error_step2.png")
        return False

    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Step 4: Fill in title
    print("Step 4: Setting title...")
    try:
        title_input = page.get_by_placeholder("Name your product")
        await title_input.fill(title[:80])
        print(f"   Title: {title[:50]}...")
    except Exception as e:
        print(f"WARNING: Could not set title: {e}")

    # Step 5: Upload PDF file
    print("Step 5: Uploading PDF file...")
    pdf_path = os.path.join(pdf_folder, filename)
    if not os.path.exists(pdf_path):
        print(f"ERROR: File not found: {pdf_path}")
        return False

    try:
        file_input = page.locator('input[type="file"]').first
        await file_input.set_input_files(pdf_path)
        print(f"   Uploaded: {filename}")
        await asyncio.sleep(5)  # Wait for upload
    except Exception as e:
        print(f"WARNING: File upload issue: {e}")

    # Step 6: Fill description (rich text editor)
    print("Step 6: Setting description...")
    try:
        desc_editor = page.locator('[contenteditable="true"]').first
        await desc_editor.click()
        await desc_editor.fill(description)
        print("   Description set")
    except Exception as e:
        print(f"WARNING: Could not set description: {e}")

    # Step 7: Set price
    print("Step 7: Setting price...")
    try:
        price_inputs = page.locator('input[placeholder="0.00"]')
        await price_inputs.first.fill(str(price))
        print(f"   Price: ${price}")
    except Exception as e:
        print(f"WARNING: Could not set price: {e}")

    # Step 8: Select grades 4-8
    print("Step 8: Selecting grades 4-8...")
    for grade in ["4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade"]:
        try:
            checkbox = page.get_by_label(grade)
            await checkbox.check()
            print(f"   Checked {grade}")
        except:
            pass

    # Step 9: Uncheck "Make Listing Active" for draft
    if SAVE_AS_DRAFT:
        print("Step 9: Setting to draft mode...")
        try:
            active_checkbox = page.get_by_label("Make Listing Active")
            if await active_checkbox.is_checked():
                await active_checkbox.uncheck()
                print("   Unchecked - will save as draft")
        except Exception as e:
            print(f"WARNING: Could not set draft mode: {e}")

    await page.screenshot(path=f"before_submit_{filename.replace('.pdf', '')}.png")

    # Step 10: Click Submit
    print("Step 10: Clicking Submit...")
    try:
        submit_btn = page.get_by_role("button", name="Submit")
        await submit_btn.click()
        await asyncio.sleep(3)
        print("   Submitted!")
        await page.screenshot(path=f"after_submit_{filename.replace('.pdf', '')}.png")
    except Exception as e:
        print(f"ERROR: Could not submit: {e}")
        return False

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
