# Job Markdown

Job Markdown is a small Chrome extension that saves the essential content of job postings across the web as clean Markdown files. Open a job-detail page, click the toolbar icon, and choose **Save as Markdown**. The title, company, location, optional job metadata, description, source URL, and capture date are processed and downloaded entirely inside the browser.

## Architecture

- `src/extractors/linkedin.ts` contains the LinkedIn-specific, self-contained page extractor. It prefers JobPosting JSON-LD, then uses semantic selector fallbacks. It removes hidden and unrelated interface elements and returns sanitized description HTML.
- `src/extractors/generic.ts` handles other public job sites. It prefers schema.org `JobPosting` JSON-LD and then uses portable semantic HTML fallbacks.
- `src/model.ts` defines the extractor boundary. A future extractor should return the same `ExtractionResult` shape.
- `src/markdown.ts` handles site-independent HTML-to-Markdown conversion, YAML front matter, and filename sanitization.
- `src/popup.ts` manages supported, ready, loading, success, and error states; injects the extractor with `chrome.scripting`; and starts a local Blob download.
- `tests/fixtures` contains saved, sanitized public-page-shaped HTML without account or session data.

The extension uses Manifest V3 and requests only `activeTab` and `scripting`. `activeTab` limits access to the page on which the user explicitly invokes the extension. No persistent host access is requested.

## Local setup

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run test
npm run build
```

Useful checks:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

The production extension is written to `dist/`.

## Load in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this repository's `dist` directory.
5. Pin **Job Markdown** to the toolbar if desired.

## Test on a job site

1. Open an individual public job-detail page. The extension supports LinkedIn and sites that publish schema.org `JobPosting` data or recognizable semantic job markup.
2. Wait for the job page to load. Job Markdown automatically expands supported **Show more** description controls before extraction.
3. Click the Job Markdown toolbar icon. The popup should say the page is ready.
4. Click **Save as Markdown** and inspect the downloaded `company-job-title.md` file.
5. Confirm the description is complete, job metadata is accurate, and navigation, recommendations, apply controls, and footer text are absent.
6. Open the popup on a non-job page to confirm that extraction reports no job posting found.

## Privacy

All extraction, conversion, and file creation happens locally in Chrome. There is no backend, analytics, account system, external API, or network transmission of captured content. The extension reads only the active page after the user invokes it and does not retain the job after download.

## Known limitations

- Job sites change markup frequently and may serve different layouts by locale, account, or experiment. Structured data and semantic fallbacks cover many sites, but unusual or canvas-based pages may still require selector maintenance.
- Individual job-detail pages are supported. Embedded job panes on search or collection routes may not expose complete job data.
- Job Markdown expands known LinkedIn description controls, but content that has not loaded or uses an unrecognized interaction may still require selector maintenance.
- Salary and job-type labels vary by locale. JSON-LD is preferred; English-labelled visual metadata is the current fallback.
- The automated fixtures validate representative markup, but an authenticated production page must be checked manually because no account data is included in tests.

## Add a site-specific optimization

1. Add a self-contained extractor under `src/extractors/` that checks its supported URL and returns `ExtractionResult` from `src/model.ts`.
2. Prefer structured job data first, add semantic selector fallbacks, and sanitize the description to the same limited HTML vocabulary.
3. Add a sanitized fixture and tests for extraction, clutter removal, missing fields, unsupported pages, and failure behavior.
4. Extend popup URL routing only when the generic extractor is insufficient. Add host permissions only if the site's flow cannot use the existing user-granted `activeTab` permission.

Do not put site-specific selectors into the Markdown or download modules.

## License

Job Markdown is available under the [MIT License](LICENSE).
