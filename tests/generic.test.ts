import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { extractGenericJob } from "../src/extractors/generic";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");

describe("generic job extraction", () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      "/careers-home/jobs/29973?lang=en-us&iis=LinkedIn",
    );
  });

  it("extracts the DocuSign JobPosting structured data", async () => {
    document.documentElement.innerHTML = fixture("docusign-job.html");
    const result = await extractGenericJob();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      title: "Vice President, Product Design & Research",
      company: "Docusign",
      location:
        "San Francisco, California, United States; Seattle, Washington, United States",
      salary: "$318,500.00 - $465,825.00 base salary",
      workplaceType: "Hybrid",
      employmentType: "FULL-TIME",
      source: "https://careers.docusign.com/careers-home/jobs/29973?lang=en-us",
    });
    expect(result.job.descriptionHtml).toContain("What you'll do");
    expect(result.job.descriptionHtml).toContain("agentic user interfaces");
    expect(result.job.descriptionHtml).not.toMatch(
      /Apply now|Recommended jobs|#LI-SS2/i,
    );
  });

  it("falls back to semantic job-page markup without structured data", async () => {
    document.documentElement.innerHTML = `
      <head><meta property="og:site_name" content="Example Careers"></head>
      <body>
        <h1>Director of Product Design</h1>
        <p class="company-name">Example Company</p>
        <p class="job-location">Remote</p>
        <section data-testid="job-description">
          <h2>What you'll do</h2>
          <p>Lead a multidisciplinary product design organization and define a coherent experience strategy across a complex enterprise product portfolio.</p>
          <p>Partner with product and engineering leaders, coach managers, improve design systems, and connect customer evidence to measurable business outcomes.</p>
        </section>
      </body>`;

    const result = await extractGenericJob();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.title).toBe("Director of Product Design");
    expect(result.job.company).toBe("Example Company");
    expect(result.job.location).toBe("Remote");
    expect(result.job.descriptionHtml).toContain(
      "measurable business outcomes",
    );
  });

  it("extracts the current Greenhouse job-board renderer", async () => {
    window.history.replaceState(
      {},
      "",
      "/eqtpartners/jobs/4908496101?gh_src=Linkedin",
    );
    document.documentElement.innerHTML = fixture("greenhouse-job.html");

    const result = await extractGenericJob();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      title: "Head of AI Enablement & Digital Workplace",
      company: "EQT Group",
      location: "Stockholm, Stockholm, Sweden",
      source:
        "https://job-boards.eu.greenhouse.io/eqtpartners/jobs/4908496101?gh_src=Linkedin",
    });
    expect(result.job.descriptionHtml).toContain("Lead AI adoption strategy");
    expect(result.job.descriptionHtml).not.toMatch(/First Name|Submit/);
  });

  it("returns unsupported when the page has no recognizable job posting", async () => {
    document.documentElement.innerHTML =
      "<head><title>Company home</title></head><body><main>Welcome to our company.</main></body>";
    const result = await extractGenericJob();
    expect(result).toMatchObject({ ok: false, reason: "unsupported" });
  });
});
