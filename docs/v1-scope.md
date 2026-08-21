# V1 Scope

## Included

- Chrome Manifest V3 toolbar extension.
- Canonical LinkedIn `/jobs/view/...` support.
- Extraction of title, company, location, optional salary/workplace/employment metadata, full available description, source URL, and capture date.
- Sanitized YAML front matter and structured Markdown output.
- Local `company-job-title.md` download.
- Clear ready, loading, success, failure, and unsupported-page states.
- Fixture-based automated tests and unpacked-extension build.

## Explicitly Excluded

- Search-page or collection-pane capture.
- Accounts, cloud storage, sync, backend services, analytics, or tracking.
- External APIs, AI features, application tracking, or a website/dashboard.
- Additional job sites and Chrome Web Store publication.

## Success Criteria

The extension should export a readable job file, omit obvious interface clutter, tolerate missing optional fields, keep content local, and declare only the permissions required for user-initiated active-page extraction.

## Non-Goals

Job Markdown does not manage applications, rewrite descriptions, score jobs, or retain a job library.

## Scope Questions

- Does a proposed change directly improve reliable one-click capture?
- Can it remain a small local extension without persistent access or infrastructure?
- Has authenticated LinkedIn testing demonstrated the need?
