# Keep linked PDFs under 60 MB

> Checks linked PDF sizes against Googlebot 60MB truncation limit

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Google indexes PDFs and can show them directly in search results. However, very large PDF files may be truncated during download, resulting in partial indexing of the content, which is why large documents often need an accompanying HTML strategy rather than relying on the PDF alone.

## Code Example

```bash
# Check a single PDF's size via HTTP header
curl -I https://example.com/docs/annual-report.pdf | grep -i content-length

# Check file size in bytes
# 1 MB = 1,048,576 bytes
# 10 MB = 10,485,760 bytes
# 60 MB = 62,914,560 bytes
```

## Why It Matters

PDFs larger than Googlebot's download threshold are partially crawled or skipped, meaning their content may not appear in search results even when linked from well-indexed pages. That makes file-size control part of the same discoverability work as [HTML companion pages](/en/rules/seo/quality) and crawl-friendly document delivery.

## Googlebot's Size Limits

Google has not published an exact byte limit, but has documented:
- Files above **15 MB** may have crawling issues
- The practical upper limit is approximately **60 MB** for content indexing
- Very large files are skipped or only the first portion is indexed

## Size Targets

| File Size | Status |
|-----------|--------|
| < 5 MB | Ideal |
| 5–15 MB | Acceptable — consider compressing |
| 15–60 MB | At risk of partial indexing |
| > 60 MB | Likely skipped by Googlebot |

## Compressing PDFs

**Ghostscript (command line):**
```bash
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE \
   -dQUIET \
   -dBATCH \
   -sOutputFile=compressed.pdf \
   original.pdf
```

PDF settings presets: `/screen` (72dpi), `/ebook` (150dpi), `/printer` (300dpi), `/prepress` (300dpi+)

**Online tools:**
- Adobe Acrobat (File → Reduce File Size)
- Smallpdf, ILovePDF, PDF24

## HTML Companion Page Strategy

For critical content in large PDFs, create an HTML landing page:

```html
<!-- HTML page for the PDF content -->
<article>
  <h1>Annual Report 2024</h1>
  <p>Key findings from our 2024 annual report...</p>
  <!-- full text content here -->
  <a href="/reports/annual-2024.pdf" rel="nofollow">
    Download PDF (8.2 MB)
  </a>
</article>
```

The HTML page is indexed fully; the PDF link uses `rel="nofollow"` if you don't need the PDF itself indexed separately.

## PDF SEO Best Practices

- Add metadata (Title, Author, Subject) to the PDF properties
- Ensure the PDF is not password-protected or encrypted
- Use descriptive file names: `annual-report-2024.pdf` not `doc123.pdf`
- Avoid scanned PDFs without OCR — the text is an image and can't be indexed

HTML pages almost always outrank PDFs for the same content. If a PDF contains important content you want to rank, consider creating an HTML version as the primary page and offering the PDF as a supplementary download.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.