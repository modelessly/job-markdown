# DECISIONS.md

Append-only decision log.

Use this file for product and architectural decisions that future agents or collaborators should understand. Do not rewrite history. If a decision changes, add a new entry that supersedes the earlier one.

## Decision Template

```md
---

## YYYY-MM-DD: [Decision Title]

Decision:
[What was decided.]

Reasoning:
[Why this direction was chosen.]

Tradeoffs:
[What this makes easier and what it makes harder.]

Status:
[Proposed / Accepted / Superseded]
```

---

## 2026-05-29: Use This Repository As A Product Harness

Decision:
This repository is a reusable product-start template rather than a product-specific codebase.

Reasoning:
The goal is to help a coding agent start new products faster by providing shared workflow instructions, product-shaping prompts, architecture guidance, and planning documents before application code exists.

Tradeoffs:
The template stays intentionally generic, so each new product still needs a real PRD and initial stack choice before implementation begins.

Status:
Accepted

---

## 2026-05-29: Keep V1 Scope Narrow By Default

Decision:
New products created from this harness should start with a narrow V1 and avoid backend infrastructure, authentication, cloud services, social features, AI generation, analytics, and unnecessary dependencies unless explicitly required by the product brief.

Reasoning:
Most early product risk is about proving the core workflow and user value. Extra infrastructure increases complexity before the product has earned it.

Tradeoffs:
Some products will need to add infrastructure earlier, but that decision should be deliberate and documented.

Status:
Accepted

---

## 2026-08-21: Build Job Markdown As A Local Manifest V3 Extension

Decision:
Use a strict TypeScript and Vite Chrome extension with a popup, a self-contained LinkedIn extractor, site-independent Markdown utilities, and fixture-based Vitest tests. Request only `activeTab` and `scripting`.

Reasoning:
This is the smallest maintainable architecture that supports explicit one-click capture, local-only processing, resilient extraction, and future extractor additions without requiring persistent host access or a backend.

Tradeoffs:
The popup's Blob download avoids a broader downloads permission, while LinkedIn markup changes may still require selector maintenance and authenticated manual testing.

Status:
Accepted

---

## 2026-08-21: License Job Markdown Under MIT

Decision:
Release Job Markdown under the MIT License.

Reasoning:
MIT keeps the small browser utility straightforward to inspect, reuse, modify, and distribute while preserving the copyright and license notice.

Tradeoffs:
Downstream projects may distribute proprietary modifications, and the license provides the software without warranty.

Status:
Accepted
