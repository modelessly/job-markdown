import type { ExtractionResult } from "../model";

// This function is deliberately self-contained: Chrome serializes it into the active tab.
export async function extractLinkedInJob(): Promise<ExtractionResult> {
  const hostname = window.location.hostname.toLowerCase();
  const supported =
    (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) &&
    /\/jobs\/view\/(?:\d+|[^/?#]+)/.test(window.location.pathname);

  if (!supported) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Open a LinkedIn job-detail page to save it.",
    };
  }

  const normalize = (value: string | null | undefined): string =>
    (value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const textFrom = (selectors: string[]): string => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = normalize(element?.textContent);
      if (value) return value;
    }
    return "";
  };

  const jsonLd = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  )
    .flatMap((script) => {
      try {
        const parsed: unknown = JSON.parse(script.textContent ?? "null");
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    })
    .flatMap((entry: unknown) => {
      if (!entry || typeof entry !== "object") return [];
      const object = entry as Record<string, unknown>;
      const graph = Array.isArray(object["@graph"]) ? object["@graph"] : [];
      return [object, ...graph];
    })
    .find((entry) => entry["@type"] === "JobPosting") as
    Record<string, unknown> | undefined;

  const stringValue = (value: unknown): string =>
    typeof value === "string" ? normalize(value) : "";
  const hiring = jsonLd?.hiringOrganization as
    Record<string, unknown> | undefined;
  const address = (jsonLd?.jobLocation as Record<string, unknown> | undefined)
    ?.address as Record<string, unknown> | undefined;
  const addressParts = [
    address?.addressLocality,
    address?.addressRegion,
    address?.addressCountry,
  ]
    .map(stringValue)
    .filter(Boolean);

  const title =
    stringValue(jsonLd?.title) ||
    textFrom([
      "h1.top-card-layout__title",
      "h1.t-24",
      ".job-details-jobs-unified-top-card__job-title h1",
      "h1",
    ]);
  const company =
    stringValue(hiring?.name) ||
    textFrom([
      ".topcard__org-name-link",
      ".job-details-jobs-unified-top-card__company-name",
      "[data-tracking-control-name='public_jobs_topcard-org-name']",
    ]);
  const location =
    addressParts.join(", ") ||
    textFrom([
      ".topcard__flavor--bullet",
      ".job-details-jobs-unified-top-card__primary-description-container .tvm__text--low-emphasis",
      ".job-details-jobs-unified-top-card__bullet",
    ]);

  const metadataText = Array.from(
    document.querySelectorAll(
      ".description__job-criteria-item, .job-details-jobs-unified-top-card__job-insight, .job-details-jobs-unified-top-card__workplace-type, .salary-main-rail__salary-range",
    ),
  )
    .map((element) => normalize(element.textContent))
    .filter(Boolean);

  const metadataByLabel = (label: RegExp): string | null => {
    const match = metadataText.find((value) => label.test(value));
    if (!match) return null;
    return normalize(match.replace(label, "")) || null;
  };

  const employmentType =
    stringValue(jsonLd?.employmentType).replace(/_/g, "-") ||
    metadataByLabel(/^(?:employment type|job type)\s*/i) ||
    metadataText.find((value) =>
      /^(?:full-time|part-time|contract|temporary|internship|volunteer|other)$/i.test(
        value,
      ),
    );
  const workplaceType =
    metadataByLabel(/^(?:workplace type)\s*/i) ||
    metadataText.find((value) => /^(?:on-site|remote|hybrid)$/i.test(value)) ||
    null;

  const baseSalary = jsonLd?.baseSalary as Record<string, unknown> | undefined;
  const salaryValue = baseSalary?.value as Record<string, unknown> | undefined;
  const salaryFromJson = (() => {
    if (!baseSalary) return "";
    const currency = stringValue(baseSalary.currency);
    const min = salaryValue?.minValue;
    const max = salaryValue?.maxValue;
    const unit = stringValue(salaryValue?.unitText);
    if (min === undefined && max === undefined) return "";
    return normalize(
      `${currency} ${String(min ?? max)}${max !== undefined && max !== min ? `–${String(max)}` : ""}${unit ? ` ${unit}` : ""}`,
    );
  })();
  const salary =
    salaryFromJson ||
    metadataByLabel(/^(?:salary|pay range|base pay range)\s*/i) ||
    metadataText.find((value) => /[$€£¥]\s?\d/.test(value)) ||
    null;

  const descriptionSelector =
    ".show-more-less-html__markup, #job-details, .jobs-description__content, .jobs-box__html-content";
  const initialDescriptionElement = document.querySelector(descriptionSelector);

  if (initialDescriptionElement) {
    const descriptionScope =
      initialDescriptionElement.closest(
        ".jobs-description, .jobs-description__container, .show-more-less-html",
      ) ??
      initialDescriptionElement.closest("article, section") ??
      initialDescriptionElement.parentElement;
    const expandSelectors = [
      ".show-more-less-html__button--more",
      ".jobs-description__footer-button",
      ".jobs-description__show-more-button",
      "button[aria-label*='description' i][aria-label*='more' i]",
      "button[data-testid*='show-more' i]",
    ];
    const expandButton = expandSelectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .find((element) => {
        if (
          !(element instanceof HTMLElement) ||
          element.hasAttribute("disabled")
        )
          return false;
        if (descriptionScope?.contains(element)) return true;
        const label = normalize(
          `${element.textContent ?? ""} ${element.getAttribute("aria-label") ?? ""}`,
        );
        return /(?:show|see|read)\s+more.*description|description.*(?:show|see|read)\s+more/i.test(
          label,
        );
      }) as HTMLElement | undefined;

    if (expandButton) {
      await new Promise<void>((resolve) => {
        let settled = false;
        let settleTimer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          if (settleTimer) clearTimeout(settleTimer);
          resolve();
        };
        const observer = new MutationObserver(() => {
          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(finish, 75);
        });
        observer.observe(descriptionScope ?? initialDescriptionElement, {
          attributes: true,
          childList: true,
          subtree: true,
        });
        expandButton.click();
        setTimeout(finish, 800);
      });
    }
  }

  const descriptionElement = document.querySelector(descriptionSelector);

  if (!title || !company || !descriptionElement) {
    return {
      ok: false,
      reason: "extraction_failed",
      message:
        "The job details could not be read. Try opening the full job page and try again.",
    };
  }

  const clone = descriptionElement.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      "script, style, iframe, nav, footer, button, form, [hidden], [aria-hidden='true'], [role='button'], [style*='display: none'], [style*='display:none'], .visually-hidden, .sr-only, .artdeco-button, .jobs-description__footer, .jobs-company__box, .similar-jobs, .job-card-container, [class*='recommend'], [class*='advert'], [data-test-id*='recommend']",
    )
    .forEach((element) => element.remove());

  const allowed = new Set([
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "P",
    "DIV",
    "SECTION",
    "UL",
    "OL",
    "LI",
    "STRONG",
    "B",
    "EM",
    "I",
    "A",
    "BR",
  ]);
  Array.from(clone.querySelectorAll("*")).forEach((element) => {
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      if (element.tagName === "A" && attribute.name === "href") return;
      element.removeAttribute(attribute.name);
    });
    if (element.tagName === "A") {
      try {
        const href = new URL(
          element.getAttribute("href") ?? "",
          window.location.href,
        );
        if (!["http:", "https:"].includes(href.protocol))
          element.removeAttribute("href");
        else element.setAttribute("href", href.href);
      } catch {
        element.removeAttribute("href");
      }
    }
  });

  if (!normalize(clone.textContent)) {
    return {
      ok: false,
      reason: "extraction_failed",
      message: "The job description appears to be empty.",
    };
  }

  const source = `${window.location.origin}${window.location.pathname}`;
  return {
    ok: true,
    job: {
      title,
      company,
      location,
      salary,
      workplaceType,
      employmentType: employmentType || null,
      descriptionHtml: clone.innerHTML,
      source,
    },
  };
}
