import type { JobPosting } from "./model";

function cleanText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function yamlValue(value: string | null): string {
  if (value === null || cleanText(value) === "") return "null";
  const withoutControlCharacters = Array.from(cleanText(value), (character) =>
    character.charCodeAt(0) < 32 ? " " : character,
  ).join("");
  return JSON.stringify(withoutControlCharacters);
}

function inlineText(value: string): string {
  return cleanText(value).replace(/([\\`*_[\]<>])/g, "\\$1");
}

function safeLink(href: string): string | null {
  try {
    const url = new URL(href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function htmlToMarkdown(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");

  const render = (node: Node, depth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/([\\`*_[\]<>])/g, "\\$1");
    }
    if (!(node instanceof Element)) return "";

    const content = Array.from(node.childNodes)
      .map((child) => render(child, depth))
      .join("");
    const tag = node.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      return `\n${"#".repeat(Math.min(level + 2, 6))} ${cleanText(content)}\n\n`;
    }
    if (tag === "p" || tag === "div" || tag === "section")
      return `\n${cleanText(content)}\n\n`;
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${cleanText(content)}**`;
    if (tag === "em" || tag === "i") return `*${cleanText(content)}*`;
    if (tag === "a") {
      const href = safeLink(node.getAttribute("href") ?? "");
      return href ? `[${cleanText(content)}](${href})` : content;
    }
    if (tag === "li") {
      const ordered = node.parentElement?.tagName.toLowerCase() === "ol";
      const index = ordered
        ? Array.from(node.parentElement?.children ?? []).indexOf(node) + 1
        : 0;
      return `${"  ".repeat(depth)}${ordered ? `${index}.` : "-"} ${cleanText(content)}\n`;
    }
    if (tag === "ul" || tag === "ol") {
      return `\n${Array.from(node.children)
        .map((child) => render(child, depth))
        .join("")}\n`;
    }
    return content;
  };

  return render(document.body)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function generateFrontMatter(job: JobPosting): string {
  return [
    "---",
    `title: ${yamlValue(job.title)}`,
    `company: ${yamlValue(job.company)}`,
    `location: ${yamlValue(job.location)}`,
    `salary: ${yamlValue(job.salary)}`,
    `workplace_type: ${yamlValue(job.workplaceType)}`,
    `employment_type: ${yamlValue(job.employmentType)}`,
    `source: ${yamlValue(job.source)}`,
    `captured: ${yamlValue(job.captured)}`,
    "---",
  ].join("\n");
}

export function generateMarkdown(job: JobPosting): string {
  const description = htmlToMarkdown(job.descriptionHtml);
  return `${generateFrontMatter(job)}\n\n# ${inlineText(job.title)}\n\n## ${inlineText(job.company)}\n\n${description}\n`;
}

export function sanitizeFilename(company: string, title: string): string {
  const slug = `${company}-${title}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
  return `${slug || "job"}.md`;
}
