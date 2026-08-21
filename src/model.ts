export interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  salary: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  descriptionHtml: string;
  source: string;
}

export interface JobPosting extends ExtractedJob {
  captured: string;
}

export type ExtractionResult =
  | { ok: true; job: ExtractedJob }
  | { ok: false; reason: "unsupported" | "extraction_failed"; message: string };
