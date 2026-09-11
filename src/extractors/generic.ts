import type { ExtractionResult } from "../model";

// This function is deliberately self-contained: Chrome serializes it into the active tab.
export async function extractGenericJob(): Promise<ExtractionResult> {
  if (!/^https?:$/.test(window.location.protocol)) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Open a public job-detail page to save it.",
    };
  }

  const normalize = (value: string | null | undefined): string =>
    (value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const stringValue = (value: unknown): string => {
    if (typeof value === "string" || typeof value === "number")
      return normalize(String(value));
    return "";
  };

  const metaContent = (selectors: string[]): string => {
    for (const selector of selectors) {
      const value = normalize(
        document.querySelector<HTMLMetaElement>(selector)?.content,
      );
      if (value) return value;
    }
    return "";
  };

  const textFrom = (selectors: string[]): string => {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const value = normalize(element.textContent);
        if (value) return value;
      }
    }
    return "";
  };

  const embeddedJsonString = (key: string): string => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `"${escapedKey}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`,
    );
    for (const script of document.scripts) {
      const match = (script.textContent ?? "").match(pattern);
      const encodedValue = match?.[1];
      if (!encodedValue) continue;
      try {
        return stringValue(JSON.parse(encodedValue));
      } catch {
        // Continue to the document-title fallback when embedded state is malformed.
      }
    }
    return "";
  };

  const records: Record<string, unknown>[] = [];
  const collectRecords = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(collectRecords);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    records.push(record);
    if (Array.isArray(record["@graph"])) collectRecords(record["@graph"]);
    if (record.mainEntity) collectRecords(record.mainEntity);
  };

  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((script) => {
      try {
        collectRecords(JSON.parse(script.textContent ?? "null"));
      } catch {
        // Ignore malformed structured data and continue with semantic HTML.
      }
    });

  const hasType = (
    record: Record<string, unknown>,
    expected: string,
  ): boolean => {
    const values = Array.isArray(record["@type"])
      ? record["@type"]
      : [record["@type"]];
    return values.some((value) => {
      const type = stringValue(value).toLowerCase();
      return (
        type === expected.toLowerCase() ||
        type.endsWith(`/${expected.toLowerCase()}`)
      );
    });
  };

  const posting = records.find((record) => hasType(record, "JobPosting"));

  const organizationName = (value: unknown): string => {
    if (typeof value === "string") return normalize(value);
    if (!value || typeof value !== "object") return "";
    return stringValue((value as Record<string, unknown>).name);
  };

  const locationName = (value: unknown): string => {
    if (typeof value === "string") return normalize(value);
    if (!value || typeof value !== "object") return "";
    const place = value as Record<string, unknown>;
    const addressValue = place.address;
    if (typeof addressValue === "string") return normalize(addressValue);
    if (!addressValue || typeof addressValue !== "object")
      return stringValue(place.name);
    const address = addressValue as Record<string, unknown>;
    const country =
      typeof address.addressCountry === "object" && address.addressCountry
        ? stringValue((address.addressCountry as Record<string, unknown>).name)
        : stringValue(address.addressCountry);
    return [address.addressLocality, address.addressRegion, country]
      .map(stringValue)
      .filter((part) => part && !/^unavailable$/i.test(part))
      .join(", ");
  };

  const structuredLocations = (
    Array.isArray(posting?.jobLocation)
      ? posting.jobLocation
      : [posting?.jobLocation]
  )
    .map(locationName)
    .filter(Boolean);
  const uniqueLocations = Array.from(new Set(structuredLocations));

  const descriptionSelectors = [
    "[itemprop='description']",
    ".job__description",
    "[data-testid*='job-description' i]",
    "[data-test*='job-description' i]",
    "[id*='job-description' i]",
    "[class*='job-description' i]",
    "[id*='jobDescription' i]",
    "[class*='jobDescription' i]",
    "article",
    "main",
  ];

  const findDescriptionElement = (): Element | null => {
    for (const selector of descriptionSelectors) {
      const candidates = Array.from(document.querySelectorAll(selector))
        .filter(
          (element) =>
            !element.closest("nav, footer, aside") &&
            normalize(element.textContent).length >= 200,
        )
        .sort(
          (left, right) =>
            normalize(left.textContent).length -
            normalize(right.textContent).length,
        );
      if (candidates[0]) return candidates[0];
    }

    const heading = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, [role='heading']"),
    ).find((element) =>
      /^(?:job description|about the role|about this role|what you(?:'|’)ll do|the role|responsibilities)$/i.test(
        normalize(element.textContent),
      ),
    );
    if (!heading) return null;

    const ancestors: Element[] = [];
    let current = heading.parentElement;
    for (let depth = 0; current && depth < 6; depth += 1) {
      if (
        !current.matches("body") &&
        normalize(current.textContent).length >= 200
      )
        ancestors.push(current);
      current = current.parentElement;
    }
    return (
      ancestors.sort(
        (left, right) =>
          normalize(left.textContent).length -
          normalize(right.textContent).length,
      )[0] ?? null
    );
  };

  let descriptionElement = posting?.description
    ? null
    : findDescriptionElement();
  if (descriptionElement) {
    const scope =
      descriptionElement.closest("article, section, main") ??
      descriptionElement.parentElement ??
      descriptionElement;
    const expandButton = Array.from(
      scope.querySelectorAll<HTMLElement>("button, [role='button']"),
    ).find((element) => {
      if (element.hasAttribute("disabled")) return false;
      const label = normalize(
        `${element.textContent ?? ""} ${element.getAttribute("aria-label") ?? ""}`,
      );
      return /^(?:(?:show|see|read|view)\s+more(?:\s+(?:description|details))?|more)$/i.test(
        label,
      );
    });
    if (expandButton) {
      await new Promise<void>((resolve) => {
        let finished = false;
        let settleTimer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
          if (finished) return;
          finished = true;
          observer.disconnect();
          if (settleTimer) clearTimeout(settleTimer);
          resolve();
        };
        const observer = new MutationObserver(() => {
          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(finish, 75);
        });
        observer.observe(scope, {
          attributes: true,
          childList: true,
          subtree: true,
        });
        expandButton.click();
        setTimeout(finish, 800);
      });
      descriptionElement = findDescriptionElement();
    }
  }

  const rawDescription = stringValue(posting?.description);
  if (!posting && !descriptionElement) {
    return {
      ok: false,
      reason: "unsupported",
      message: "No job posting was found on this page.",
    };
  }

  const descriptionDocument = rawDescription
    ? new DOMParser().parseFromString(rawDescription, "text/html")
    : null;
  const descriptionRoot = descriptionDocument?.body ?? descriptionElement;
  const descriptionText = normalize(descriptionRoot?.textContent);

  const title =
    stringValue(posting?.title) ||
    textFrom([
      "[itemprop='title']",
      ".job__title h1",
      "h1",
      "[data-testid*='job-title' i]",
    ]) ||
    metaContent(["meta[property='og:title']", "meta[name='twitter:title']"])
      .replace(/\s+[|–-]\s+[^|–-]+$/, "")
      .trim();
  const greenhouseTitleCompany =
    normalize(document.title).match(
      /^Job Application for .+\s+at\s+(.+)$/i,
    )?.[1] ?? "";
  const company =
    organizationName(posting?.hiringOrganization) ||
    textFrom([
      "[itemprop='hiringOrganization']",
      "[data-testid*='company-name' i]",
      "[class*='company-name' i]",
      "[class*='companyName' i]",
    ]) ||
    embeddedJsonString("company_name") ||
    normalize(greenhouseTitleCompany) ||
    metaContent(["meta[property='og:site_name']"]).replace(/\s+careers?$/i, "");
  const location =
    uniqueLocations.join("; ") ||
    textFrom([
      "[itemprop='jobLocation']",
      ".job__location",
      "[data-testid*='job-location' i]",
      "[class*='job-location' i]",
      "[class*='jobLocation' i]",
      "[class*='location' i]",
    ]);

  const employmentValue = Array.isArray(posting?.employmentType)
    ? posting.employmentType.map(stringValue).filter(Boolean).join(", ")
    : stringValue(posting?.employmentType);
  const employmentType =
    employmentValue.replace(/_/g, "-") ||
    descriptionText.match(
      /\b(?:full[- ]time|part[- ]time|contract|temporary|internship|volunteer)\b/i,
    )?.[0] ||
    null;

  const jobLocationType = stringValue(posting?.jobLocationType);
  const workplaceLabel =
    (/telecommute|remote/i.test(jobLocationType) ? "Remote" : "") ||
    descriptionText.match(/(hybrid|remote|on[- ]site|in office)\s*:/i)?.[1] ||
    descriptionText.match(/\b(hybrid|remote|on[- ]site|in office)\b/i)?.[1] ||
    "";
  const workplaceType = workplaceLabel
    ? /hybrid/i.test(workplaceLabel)
      ? "Hybrid"
      : /remote/i.test(workplaceLabel)
        ? "Remote"
        : /in office/i.test(workplaceLabel)
          ? "In Office"
          : "On-site"
    : null;

  const baseSalary =
    posting?.baseSalary && typeof posting.baseSalary === "object"
      ? (posting.baseSalary as Record<string, unknown>)
      : null;
  const salaryValue =
    baseSalary?.value && typeof baseSalary.value === "object"
      ? (baseSalary.value as Record<string, unknown>)
      : null;
  const minSalary = Number(salaryValue?.minValue ?? salaryValue?.value ?? 0);
  const maxSalary = Number(salaryValue?.maxValue ?? salaryValue?.value ?? 0);
  const salaryFromStructuredData =
    minSalary > 0 || maxSalary > 0
      ? normalize(
          `${stringValue(baseSalary?.currency ?? posting?.salaryCurrency)} ${String(minSalary || maxSalary)}${maxSalary > 0 && maxSalary !== minSalary ? `–${String(maxSalary)}` : ""} ${stringValue(salaryValue?.unitText)}`,
        )
      : "";
  const salary =
    salaryFromStructuredData ||
    descriptionText.match(
      /(?:USD\s*)?[$€£¥]\s?\d[\d,.]*(?:\s*[-–]\s*[$€£¥]?\s?\d[\d,.]*)?(?:\s+(?:base salary|per (?:year|hour|month)))?/i,
    )?.[0] ||
    null;

  if (!title || !company || !descriptionRoot || descriptionText.length < 100) {
    const missing = [
      !title ? "job title" : "",
      !company ? "company" : "",
      !descriptionRoot || descriptionText.length < 100 ? "job description" : "",
    ].filter(Boolean);
    return {
      ok: false,
      reason: "extraction_failed",
      message: `Could not read the ${missing.join(", ")}. This site may use a job-page format this version does not recognize.`,
    };
  }

  const clone = descriptionRoot.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      "script, style, iframe, nav, footer, aside, button, form, input, select, textarea, [hidden], [aria-hidden='true'], [role='button'], [style*='display: none'], [style*='display:none'], [style*='visibility: hidden'], [style*='visibility:hidden'], [style*='color: #ffffff' i], [style*='color:#ffffff' i], .visually-hidden, .sr-only, [class*='recommend' i], [class*='advert' i], [class*='similar-job' i]",
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
        if (["http:", "https:"].includes(href.protocol))
          element.setAttribute("href", href.href);
        else element.removeAttribute("href");
      } catch {
        element.removeAttribute("href");
      }
    }
  });

  const canonicalHref =
    document.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href ??
    "";
  let source = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  try {
    const canonical = new URL(canonicalHref);
    if (/^https?:$/.test(canonical.protocol)) source = canonical.href;
  } catch {
    // Keep the current page URL when no valid canonical URL exists.
  }

  return {
    ok: true,
    job: {
      title,
      company,
      location,
      salary,
      workplaceType,
      employmentType,
      descriptionHtml: clone.innerHTML,
      source,
    },
  };
}
