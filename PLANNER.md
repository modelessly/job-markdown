# PLANNER.md

## Current Focus

Manual Chrome validation of the completed Job Markdown MVP.

## Now

- Load the production `dist/` directory as an unpacked extension and test an authenticated LinkedIn job-detail page.

## Next

- Capture any selector or locale gaps found during live testing.
- Re-run the full validation suite after fixes, if any.
- Use the release checklist only when packaging or publication is requested.

## Blocked

- Authenticated LinkedIn verification requires a manual browser session; fixtures intentionally contain no account or session data.

## Done

- MVP source, popup, extractor, Markdown output, fixtures, automated tests, build, and documentation completed on 2026-08-21.

## Handoff Notes

- Run `npm install`, then `npm run build`; load `dist/` in `chrome://extensions`.
- The manifest intentionally declares only `activeTab` and `scripting`.
- LinkedIn-specific code belongs in `src/extractors`; keep Markdown and download code site-independent.
