import { describe, expect, it } from "vitest";
import {
  generateFrontMatter,
  generateMarkdown,
  sanitizeFilename,
} from "../src/markdown";
import type { JobPosting } from "../src/model";

const job: JobPosting = {
  title: 'Senior "Product" Designer',
  company: "Exämple Co",
  location: "Stockholm, Sweden",
  salary: null,
  workplaceType: "Hybrid",
  employmentType: "Full-time",
  source: "https://www.linkedin.com/jobs/view/123456789",
  captured: "2026-08-21",
  descriptionHtml:
    "<h2>About the role</h2><p>Build <strong>useful</strong> things.</p><ul><li>Lead discovery</li></ul>",
};

describe("sanitizeFilename", () => {
  it("creates a safe company-title filename", () => {
    expect(
      sanitizeFilename("Exämple / Co.", "Senior: Product Designer?!"),
    ).toBe("example-co-senior-product-designer.md");
  });

  it("includes the Lenovo role title after the company name", () => {
    expect(
      sanitizeFilename(
        "Lenovo",
        "Executive Design Director, Innovation Experience Design",
      ),
    ).toBe("lenovo-executive-design-director-innovation-experience-design.md");
  });

  it("falls back when the input has no usable characters", () => {
    expect(sanitizeFilename("公司", "設計師")).toBe("job.md");
  });
});

describe("front matter", () => {
  it("quotes YAML values and emits null for missing optional fields", () => {
    const frontMatter = generateFrontMatter(job);
    expect(frontMatter).toContain('title: "Senior \\"Product\\" Designer"');
    expect(frontMatter).toContain("salary: null");
    expect(frontMatter).toContain('captured: "2026-08-21"');
  });
});

describe("generateMarkdown", () => {
  it("renders headings, emphasis, and lists", () => {
    const markdown = generateMarkdown(job);
    expect(markdown).toContain('# Senior "Product" Designer');
    expect(markdown).toContain("#### About the role");
    expect(markdown).toContain("Build **useful** things.");
    expect(markdown).toContain("- Lead discovery");
  });

  it("handles every optional field being missing", () => {
    const markdown = generateMarkdown({
      ...job,
      salary: null,
      workplaceType: null,
      employmentType: null,
    });
    expect(markdown.match(/: null/g)).toHaveLength(3);
  });
});
