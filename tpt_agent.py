#!/usr/bin/env python3
"""
TPT Virtual Assistant Agent
Main entry point for the TPT upload automation tool.
"""

import click
import logging
from pathlib import Path

from src.metadata import load_products_csv, validate_product
from src.browser import TPTBrowser
from src.uploader import TPTUploader
from src.utils import setup_logging, load_settings


@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.pass_context
def cli(ctx, verbose):
    """TPT Virtual Assistant - Automate your TPT uploads."""
    ctx.ensure_object(dict)
    ctx.obj['verbose'] = verbose

    # Setup logging
    log_level = logging.DEBUG if verbose else logging.INFO
    setup_logging(log_level)


@cli.command()
@click.argument('filename')
@click.option('--dry-run', is_flag=True, help='Preview without uploading')
@click.pass_context
def upload(ctx, filename, dry_run):
    """Upload a single product to TPT."""
    logger = logging.getLogger(__name__)
    logger.info(f"Preparing to upload: {filename}")

    # Load settings
    settings = load_settings()
    if not settings:
        click.echo("Error: Could not load settings. Copy config/settings.example.yaml to config/settings.yaml")
        return

    # Load and validate product metadata
    products = load_products_csv(settings['paths']['products_csv'])
    product = next((p for p in products if p['filename'] == filename), None)

    if not product:
        click.echo(f"Error: Product '{filename}' not found in products.csv")
        return

    # Validate product data
    errors = validate_product(product)
    if errors:
        click.echo("Validation errors found:")
        for error in errors:
            click.echo(f"  - {error}")
        return

    # Show preview
    click.echo("\n=== Upload Preview ===")
    click.echo(f"File: {product['filename']}")
    click.echo(f"Title: {product['title']}")
    click.echo(f"Price: ${product['price']}")
    click.echo(f"Grades: {product['grades']}")
    click.echo(f"Tags: {product.get('reading_tags', 'None')}")
    click.echo("=" * 22)

    if dry_run:
        click.echo("\n[DRY RUN] No changes made.")
        return

    # Confirm before upload
    if settings['upload'].get('confirm_before_upload', True):
        if not click.confirm("\nProceed with upload?"):
            click.echo("Upload cancelled.")
            return

    # Perform upload
    click.echo("\nStarting upload...")
    # TODO: Implement actual upload logic
    click.echo("Upload functionality not yet implemented.")


@cli.command()
@click.argument('folder', type=click.Path(exists=True))
@click.option('--dry-run', is_flag=True, help='Preview without uploading')
@click.pass_context
def batch(ctx, folder, dry_run):
    """Batch upload all products from a folder."""
    logger = logging.getLogger(__name__)
    logger.info(f"Batch upload from: {folder}")

    # Load settings
    settings = load_settings()
    if not settings:
        click.echo("Error: Could not load settings.")
        return

    # Load all products
    csv_path = Path(folder) / "products.csv"
    if not csv_path.exists():
        click.echo(f"Error: products.csv not found in {folder}")
        return

    products = load_products_csv(str(csv_path))

    if not products:
        click.echo("No products found in CSV.")
        return

    click.echo(f"\nFound {len(products)} products to upload:\n")

    # Validate all products first
    all_valid = True
    for i, product in enumerate(products, 1):
        errors = validate_product(product)
        status = "✓" if not errors else "✗"
        click.echo(f"  {status} {product['filename']}")
        if errors:
            all_valid = False
            for error in errors:
                click.echo(f"      - {error}")

    if not all_valid:
        click.echo("\nSome products have validation errors. Fix them before uploading.")
        return

    if dry_run:
        click.echo("\n[DRY RUN] Validation passed. No uploads performed.")
        return

    # Confirm batch upload
    if not click.confirm(f"\nUpload all {len(products)} products?"):
        click.echo("Batch upload cancelled.")
        return

    # TODO: Implement batch upload logic
    click.echo("\nBatch upload functionality not yet implemented.")


@cli.command()
def validate():
    """Validate products.csv without uploading."""
    settings = load_settings()
    if not settings:
        click.echo("Error: Could not load settings.")
        return

    csv_path = settings['paths']['products_csv']
    products = load_products_csv(csv_path)

    if not products:
        click.echo("No products found or CSV could not be loaded.")
        return

    click.echo(f"Validating {len(products)} products...\n")

    error_count = 0
    for product in products:
        errors = validate_product(product)
        if errors:
            error_count += 1
            click.echo(f"✗ {product.get('filename', 'Unknown')}")
            for error in errors:
                click.echo(f"    - {error}")
        else:
            click.echo(f"✓ {product.get('filename', 'Unknown')}")

    click.echo(f"\nValidation complete: {len(products) - error_count}/{len(products)} products valid.")


if __name__ == '__main__':
    cli()
