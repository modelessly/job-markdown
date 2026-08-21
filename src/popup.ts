import { extractLinkedInJob } from "./extractors/linkedin";
import { generateMarkdown, sanitizeFilename } from "./markdown";

const button = document.querySelector<HTMLButtonElement>("#save-button");
const status = document.querySelector<HTMLElement>("#status");
const statusMessage = document.querySelector<HTMLElement>("#status-message");

if (!button || !status || !statusMessage)
  throw new Error("Popup UI is incomplete.");

const setState = (
  state: "ready" | "loading" | "success" | "error" | "unsupported",
  message: string,
) => {
  status.dataset.state = state;
  statusMessage.textContent = message;
  button.disabled = state !== "ready";
  button.setAttribute("aria-busy", String(state === "loading"));
};

const getActiveTab = async (): Promise<chrome.tabs.Tab | null> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
};

const isLinkedInJobUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "linkedin.com" ||
        parsed.hostname.endsWith(".linkedin.com")) &&
      /\/jobs\/view\/(?:\d+|[^/?#]+)/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
};

const initialize = async () => {
  const tab = await getActiveTab();
  if (!tab?.id || !isLinkedInJobUrl(tab.url)) {
    setState("unsupported", "Open a LinkedIn job-detail page to save it.");
    return;
  }
  setState("ready", "Ready to save this job.");
};

button.addEventListener("click", async () => {
  setState("loading", "Reading the job details…");
  try {
    const tab = await getActiveTab();
    if (!tab?.id || !isLinkedInJobUrl(tab.url)) {
      setState("unsupported", "This is not a supported LinkedIn job page.");
      return;
    }

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractLinkedInJob,
    });
    const result = injection?.result;
    if (!result?.ok) {
      setState(
        result?.reason === "unsupported" ? "unsupported" : "error",
        result?.message ?? "Could not read this job.",
      );
      return;
    }

    const job = {
      ...result.job,
      captured: new Date().toISOString().slice(0, 10),
    };
    const markdown = generateMarkdown(job);
    const filename = sanitizeFilename(job.company, job.title);
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setState("success", `Saved ${filename}`);
  } catch (error) {
    const message =
      error instanceof Error && /Cannot access|permission/i.test(error.message)
        ? "Chrome could not access this page. Refresh it and try again."
        : "Something went wrong while saving this job.";
    setState("error", message);
  }
});

initialize().catch(() =>
  setState("error", "Could not inspect the current tab."),
);
