# ARCHITECTURE.md

## Platform

- Primary platform: Chrome extension using Manifest V3
- Secondary platforms: none
- Runtime: current Chrome; development requires Node.js 20.19+ or 22.12+

## Core Technologies

- UI: semantic HTML and CSS popup
- Language: strict TypeScript
- Persistence: none; output is downloaded as a local Markdown file
- Networking: none
- Build tooling: Vite and TypeScript
- Testing: Vitest with jsdom and sanitized HTML fixtures

## Architectural Goals

Prioritize a fast one-action workflow, local-only processing, resilient extraction, clear module boundaries, and focused tests. Avoid background services, persistent host access, speculative abstractions, and site-specific logic outside extractor modules.

## Structure

- `src/extractors/linkedin.ts`: self-contained LinkedIn page extractor serialized into the active tab
- `src/model.ts`: shared extraction and normalized job-data types
- `src/markdown.ts`: site-independent sanitization, YAML, Markdown, and filename generation
- `src/popup.ts`: active-tab routing, UI state, extraction orchestration, and Blob download
- `src/popup.css` and `popup.html`: accessible popup presentation
- `tests/fixtures`: sanitized page-shaped HTML used by extraction tests
- `public/manifest.json`: minimum-permission extension manifest

## Data Model

`ExtractedJob` contains title, company, location, nullable salary/workplace/employment values, sanitized description HTML, and source URL. `JobPosting` adds the local capture date. Extractors return a discriminated `ExtractionResult` for success, unsupported page, or extraction failure.

## State Ownership

Popup state is ephemeral and owns ready, loading, success, error, and unsupported feedback. No job content persists after the Blob download is initiated.

## Integration Boundaries

- Chrome `activeTab`: temporary access granted by the user's toolbar invocation
- Chrome `scripting`: runs the self-contained extractor in the active page
- LinkedIn DOM and JobPosting JSON-LD: read-only inputs that may change over time

No external service, SDK, API, or remote content processor is used.

## Reliability Requirements

- Reject unsupported URLs before injection.
- Prefer JSON-LD and use multiple semantic selector fallbacks.
- Fail clearly when required fields or description content are unavailable.
- Treat salary, workplace type, and employment type as optional.
- Remove scripts, controls, hidden elements, advertisements, and recommendations.
- Sanitize links, YAML strings, Markdown text, and filenames.

## Future-Proofing

Additional sites should add a self-contained extractor returning the existing `ExtractionResult`. Popup routing can then select an extractor by URL without changing Markdown or download logic.
