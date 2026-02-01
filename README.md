# TPT Virtual Assistant Agent

An automated agent for uploading educational resources to Teachers Pay Teachers (TPT).

## Project Goals

- Automate the repetitive document upload process to TPT
- Handle all metadata entry automatically (titles, descriptions, pricing, grades, tags)
- Make it easy for non-technical users to configure and run
- Reduce hours of manual work to minutes

## Status

🚧 **In Development** - Project scaffolding phase

## Supported Content Types

- PDF documents
- Images (thumbnails, previews)
- Bundles (multiple files per product)

## Metadata Handled

| Field | Description |
|-------|-------------|
| Title | Product title |
| Description | Full product description |
| Pricing | Product price |
| Grades | Target grade levels |
| Reading Tags | Reading, Close Reading, Informational Text |
| Audience/Theme Tags | 5-6 selectable options per product |

## Technical Approach

- **Language:** Python (beginner-friendly, excellent automation support)
- **Browser Automation:** Playwright (modern, reliable, handles dynamic sites well)
- **Configuration:** Simple spreadsheet or YAML files for metadata
- **Source:** Local folder (with potential cloud storage support later)

### Why Browser Automation?
TPT does not provide a public API, so we automate the browser to interact with their website directly—filling forms, uploading files, and clicking buttons just like a human would.

## Planned Features

- [ ] TPT login automation (with saved credentials)
- [ ] Single product upload
- [ ] Batch upload from folder
- [ ] Metadata via spreadsheet (CSV/Excel)
- [ ] Auto-fill tags and categories
- [ ] Thumbnail/preview upload
- [ ] Bundle creation support
- [ ] Progress tracking and error recovery
- [ ] Dry-run mode (preview without uploading)

## Getting Started

### Prerequisites
- Python 3.10+
- Chrome or Firefox browser
- TPT seller account

### Installation
*Coming soon*

### Configuration
Products are configured via a simple spreadsheet:

```
products.csv:
filename,title,description,price,grades,tags
my-worksheet.pdf,Reading Comprehension Pack,A collection of...,4.99,3-5,reading;close-reading
```

### Usage
```bash
# Upload a single product
python tpt_agent.py upload my-worksheet.pdf

# Batch upload all products in folder
python tpt_agent.py batch ./products/

# Preview what would be uploaded (dry run)
python tpt_agent.py batch ./products/ --dry-run
```

## Project Structure

```
ClaudeFun/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── tpt_agent.py          # Main entry point
├── src/
│   ├── browser.py        # Browser automation logic
│   ├── uploader.py       # TPT upload workflows
│   ├── metadata.py       # Spreadsheet/config parsing
│   └── utils.py          # Helper functions
├── config/
│   ├── settings.yaml     # User settings (credentials, paths)
│   └── tags.yaml         # TPT tag/category mappings
├── products/             # Your products to upload (local)
│   └── products.csv      # Product metadata spreadsheet
└── logs/                 # Upload logs and error reports
```

## Security Notes

- Credentials are stored locally and never shared
- Use environment variables or a secure config file for passwords
- Never commit credentials to git

## Future Ideas

- Google Drive / Dropbox integration
- AI-assisted description generation
- Scheduling uploads
- Analytics dashboard

## License

MIT
