import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { extractLinkedInJob } from "../src/extractors/linkedin";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");

describe("LinkedIn extraction", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/jobs/view/123456789/");
  });

  it("extracts representative structured and semantic job content", async () => {
    document.documentElement.innerHTML = fixture("linkedin-job.html");
    const result = await extractLinkedInJob();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      title: "Senior Product Designer",
      company: "Example Co",
      location: "Stockholm, Sweden",
      salary: "SEK 600000–750000 YEAR",
      workplaceType: "Hybrid",
      employmentType: "FULL-TIME",
      source: "https://www.linkedin.com/jobs/view/123456789/",
    });
    expect(result.job.descriptionHtml).toContain("About the role");
    expect(result.job.descriptionHtml).toContain(
      "<strong>millions of people</strong>",
    );
  });

  it("expands a collapsed description before extracting it", async () => {
    document.documentElement.innerHTML = fixture("linkedin-job.html");
    const hiddenContent = document.querySelector<HTMLElement>(
      "#collapsed-description-content",
    );
    const expandButton = document.querySelector<HTMLButtonElement>(
      ".jobs-description__footer-button",
    );
    let clicked = false;
    expandButton?.addEventListener("click", () => {
      clicked = true;
      hiddenContent?.removeAttribute("hidden");
    });

    const result = await extractLinkedInJob();
    expect(clicked).toBe(true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.descriptionHtml).toContain(
      "The final paragraph was initially collapsed.",
    );
  });

  it("extracts the semantic authenticated job layout", async () => {
    document.documentElement.innerHTML = fixture(
      "linkedin-job-authenticated.html",
    );
    const hiddenContent = document.querySelector<HTMLElement>(
      "#authenticated-collapsed-content",
    );
    document
      .querySelector<HTMLButtonElement>(
        "[data-testid='expandable-text-button']",
      )
      ?.addEventListener("click", () =>
        hiddenContent?.removeAttribute("hidden"),
      );

    const result = await extractLinkedInJob();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.title).toBe(
      "Executive Design Director, Innovation Experience Design",
    );
    expect(result.job.company).toBe("Lenovo");
    expect(result.job.descriptionHtml).toContain(
      "This authenticated-layout paragraph was initially collapsed.",
    );
  });

  it("removes controls, recommendations, scripts, and hidden content", async () => {
    document.documentElement.innerHTML = fixture("linkedin-job.html");
    const result = await extractLinkedInJob();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.job.descriptionHtml).not.toMatch(
      /Apply now|Recommended jobs|Hidden tracking|script/i,
    );
    expect((window as Window & { stolen?: boolean }).stolen).toBeUndefined();
  });

  it("allows missing optional fields", async () => {
    document.documentElement.innerHTML = fixture("linkedin-job-minimal.html");
    const result = await extractLinkedInJob();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.salary).toBeNull();
    expect(result.job.workplaceType).toBeNull();
    expect(result.job.employmentType).toBeNull();
  });

  it("returns an extraction failure when required content is absent", async () => {
    document.documentElement.innerHTML = fixture("linkedin-job-invalid.html");
    const result = await extractLinkedInJob();
    expect(result).toMatchObject({ ok: false, reason: "extraction_failed" });
  });

  it("returns unsupported for a non-job LinkedIn page", async () => {
    window.history.replaceState({}, "", "/feed/");
    document.body.innerHTML = "<main>Feed</main>";
    const result = await extractLinkedInJob();
    expect(result).toMatchObject({ ok: false, reason: "unsupported" });
  });
});
