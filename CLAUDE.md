# CLAUDE.md - AI Assistant Instructions

This file provides instructions for AI assistants working on the TPT Virtual Assistant Agent project.

## Project Overview

This is a browser automation tool that uploads educational resources to Teachers Pay Teachers (TPT). It handles PDFs, images, and bundles with associated metadata (titles, descriptions, pricing, grades, tags).

**The user is not a programmer.** Write clear, well-commented code and explain technical decisions in plain language.

## Critical Principle: Quality Control First

**This project deals with real products, real money, and a real TPT store.** Mistakes can result in:
- Wrong prices being published (financial loss)
- Wrong files uploaded to wrong products
- Incorrect metadata damaging store reputation
- Account issues from malformed uploads

### Mandatory Quality Checks

Before ANY upload or automation action:

1. **Validate all inputs**
   - File exists and is readable
   - File type matches expected (PDF, image, etc.)
   - Metadata fields are complete and properly formatted
   - Price is a valid number in expected range
   - Grade levels are valid TPT options
   - Tags match allowed TPT categories

2. **Preview before execution**
   - Always implement dry-run modes
   - Show exactly what will be uploaded before doing it
   - Display file names, titles, prices, and all metadata for confirmation

3. **Verify after execution**
   - Confirm upload succeeded (don't assume)
   - Check that metadata was saved correctly
   - Log all actions with timestamps
   - Take screenshots of completed uploads when possible

4. **Fail safely**
   - Stop on first error, don't continue batch
   - Never leave partial uploads in unknown states
   - Provide clear error messages explaining what went wrong
   - Suggest specific fixes for common errors

## Code Quality Standards

### Every Function Must:
- Validate inputs before processing
- Return clear success/failure indicators
- Log what it's doing at each step
- Handle exceptions gracefully with informative messages

### Every Automation Step Must:
- Wait for page elements to be ready (never assume timing)
- Verify the expected page/state before acting
- Confirm action completed before proceeding
- Have timeout handling with clear error messages

### Testing Requirements
- Test with dummy/draft products first
- Never test with real products unless explicitly confirmed
- Implement a sandbox/test mode that doesn't actually submit
- Verify against TPT's actual website behavior regularly

## File Structure

```
ClaudeFun/
├── CLAUDE.md             # This file - AI instructions
├── README.md             # User documentation
├── requirements.txt      # Python dependencies
├── tpt_agent.py         # Main entry point
├── src/
│   ├── browser.py       # Browser automation (Playwright)
│   ├── uploader.py      # TPT upload workflows
│   ├── metadata.py      # CSV/config parsing
│   ├── validators.py    # Input validation functions
│   └── utils.py         # Helper functions
├── config/
│   ├── settings.yaml    # User settings
│   └── tags.yaml        # TPT tag mappings
├── products/            # Products to upload
│   └── products.csv     # Product metadata
└── logs/                # Logs and reports
```

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Language | Python 3.10+ | Beginner-friendly, excellent automation libraries |
| Browser Automation | Playwright | Modern, reliable, good async support, auto-waits |
| Config Format | CSV + YAML | Spreadsheets are familiar to non-programmers |
| Logging | Python logging module | Built-in, flexible, file + console output |

## TPT-Specific Knowledge

### Upload Workflow (expected)
1. Login to TPT seller dashboard
2. Navigate to "Add New Product"
3. Upload main product file(s)
4. Upload thumbnail/preview images
5. Fill in title, description
6. Set price
7. Select grade levels
8. Select subject/category tags
9. Select resource type tags
10. Review and publish (or save as draft)

### Important TPT Considerations
- TPT may have rate limiting - add delays between uploads
- Session may timeout - implement re-authentication
- Form fields may change - use robust selectors
- Some fields have specific format requirements
- Draft mode should be default (publish only when confirmed)

## Validation Rules

### File Validation
```python
# Always verify before upload
- File exists: os.path.isfile(path)
- File readable: try opening with read permissions
- File type: check extension AND magic bytes if possible
- File size: within TPT limits (check current limits)
```

### Metadata Validation
```python
# Required fields - never proceed if missing
- title: non-empty string, reasonable length
- price: positive number, format as X.XX
- grades: must match TPT's grade level options exactly

# Warn but allow
- description: warn if empty or very short
- tags: warn if none selected
```

### Price Validation
```python
# Prices require extra scrutiny
- Must be positive number
- Reasonable range check (e.g., $0.50 - $100.00)
- Warn on unusually low prices (< $1.00)
- Warn on unusually high prices (> $20.00)
- Format to exactly 2 decimal places
```

## Error Handling Protocol

1. **Log the error** with full context (file, action, state)
2. **Stop the batch** - don't continue to next item
3. **Preserve state** - note what succeeded before failure
4. **Clear message** - explain what failed and why
5. **Recovery suggestion** - tell user how to fix/retry

## Commit Message Convention

```
type: brief description

- Detailed point 1
- Detailed point 2

Types: feat, fix, docs, refactor, test, chore
```

## Before Submitting Any Code

Checklist:
- [ ] All inputs validated before use
- [ ] Error handling for all external operations (file I/O, network, browser)
- [ ] Logging added for key operations
- [ ] Dry-run mode works correctly
- [ ] No hardcoded credentials or paths
- [ ] Code comments explain non-obvious logic
- [ ] Tested with sample/dummy data

## Questions to Ask the User

When uncertain, ask before proceeding:
- "Should this upload as draft or published?"
- "The price seems [low/high] - is $X.XX correct?"
- "File X is missing metadata - skip or stop?"
- "This will upload N products - proceed?"

## Remember

**Quality over speed.** It's better to catch an error before upload than to fix a mistake on the live store. Every automation action should be reversible or at minimum, done in draft mode first.
