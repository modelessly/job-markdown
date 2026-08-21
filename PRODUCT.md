# PRODUCT.md

## Product Name

Job Markdown

## One-Sentence Description

A local-first Chrome extension that saves the essential content of a LinkedIn job posting as a clean Markdown file with one click.

## Vision

Job Markdown gives job seekers a durable, portable copy of a posting before it changes or disappears. The product should make capture feel immediate and trustworthy, producing plain files that remain useful in any notes system or editor.

## Core User

Job seekers who research and track roles in Markdown-friendly tools and want a clean record without manually copying LinkedIn interface clutter.

## Core Moment

The user is viewing a LinkedIn job-detail page and decides the role is worth saving for later review or application preparation.

## Problem

Job postings are temporary, visually cluttered, and awkward to archive. Copying by hand loses structure and wastes time.

## Product Thesis

If saving a job as structured Markdown takes one clear action, job seekers can maintain useful, portable records without adding another account or workflow.

## Emotional Goals

The product should feel calm, immediate, and trustworthy. It should not feel intrusive, complicated, or cloud-dependent.

## What This Product Is

- A focused Chrome toolbar utility.
- A local converter from supported job pages to readable Markdown.
- A foundation for adding other job-site extractors later.

## What This Product Is Not

- A job application tracker or dashboard.
- A cloud service, account system, or data sync product.
- An AI writing, recommendation, or analysis tool.

## V1 User Promise

On a supported LinkedIn job-detail page, the user can download a readable Markdown file containing the important job metadata and complete available description without obvious LinkedIn interface clutter.

## V1 Scope

### Included

- Manifest V3 Chrome extension with a polished popup.
- LinkedIn job-detail extraction with structured-data and selector fallbacks.
- YAML front matter, formatted description, safe filename, and local download.
- Ready, loading, success, failure, and unsupported-page feedback.

### Explicitly Excluded

- Accounts, backend services, analytics, or external APIs.
- Google Drive or other cloud integrations.
- AI features and conventional website/dashboard UI.

## Core Workflow

1. Open a canonical LinkedIn `/jobs/view/...` page.
2. Open Job Markdown and click **Save as Markdown**.
3. Receive `company-job-title.md` in the browser's download location.

## Success Criteria

- Required job data and the available full description export successfully.
- Missing optional metadata does not prevent export.
- Obvious navigation, controls, ads, and recommendations are excluded.
- Captured content never leaves the browser.

## Open Questions

- Which additional LinkedIn layouts or locales require selector fallbacks after authenticated manual testing?
- Which job site should be supported next, if real usage validates expansion?

## Future Directions

Additional job-site extractors may be considered after the LinkedIn workflow is validated. They are not part of V1.
