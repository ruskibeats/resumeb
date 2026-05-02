import type { JobResult, SearchParams, SearchResponse } from "@/schema/jobs";

import type { JobSearchProvider } from "../provider";

const DEFAULT_COUNTRY = "GB";
const RESULTS_PER_PAGE = 10;

type RssItem = {
  title: string;
  link: string;
  description: string;
  guid: string;
  pubDate: string;
};

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replaceAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replaceAll(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replaceAll(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll(/&([a-z]+);/gi, (match, entity: string) => named[entity.toLowerCase()] ?? match);
}

function getTagValue(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return match ? decodeEntities(match[1].trim()) : "";
}

function parseItems(xml: string): RssItem[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    return {
      title: getTagValue(item, "title"),
      link: getTagValue(item, "link"),
      description: getTagValue(item, "description"),
      guid: getTagValue(item, "guid"),
      pubDate: getTagValue(item, "pubDate"),
    };
  });
}

function htmlToText(value: string): string {
  return decodeEntities(value)
    .replaceAll(/<\s*br\s*\/?>/gi, "\n")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/[^\S\n]+/g, " ")
    .replaceAll(/\n\s*/g, "\n")
    .trim();
}

function extractLabel(description: string, label: string): string {
  const normalized = htmlToText(description);
  const match = new RegExp(`${label}:\\s*(.*?)(?=\\n|\\s+(?:Rate|Location):|$)`, "i").exec(normalized);
  return match?.[1]?.trim() ?? "";
}

function parseSalary(description: string): Pick<
  JobResult,
  "job_min_salary" | "job_max_salary" | "job_salary_currency" | "job_salary_period"
> {
  const rate = extractLabel(description, "Rate");
  const amounts = [...rate.matchAll(/£\s*([\d,]+(?:\.\d+)?)/g)].map((match) =>
    Number.parseFloat(match[1].replaceAll(",", "")),
  );

  if (amounts.length === 0) {
    return { job_min_salary: null, job_max_salary: null, job_salary_currency: null, job_salary_period: null };
  }

  const period = /\bday\b|\bdaily\b/i.test(rate) ? "DAY" : /\bhour|hourly\b/i.test(rate) ? "HOUR" : null;
  const [first, second] = amounts;
  const isUpperBoundOnly = /\bup to\b/i.test(rate) || amounts.length === 1;

  return {
    job_min_salary: isUpperBoundOnly ? null : first,
    job_max_salary: second ?? first,
    job_salary_currency: "GBP",
    job_salary_period: period,
  };
}

function parseDate(value: string): { timestamp: number | null; iso: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { timestamp: null, iso: "" };
  return { timestamp: Math.floor(date.getTime() / 1000), iso: date.toISOString() };
}

function matchesQuery(job: JobResult, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized || normalized === "*") return true;

  const terms = normalized.split(/\s+/).filter(Boolean);
  const searchable = `${job.job_title} ${job.employer_name} ${job.job_city} ${job.job_description}`.toLowerCase();
  return terms.every((term) => searchable.includes(term));
}

function toJobResult(item: RssItem, source: "jobserve" | "linkedin"): JobResult {
  const link = item.link || item.guid;
  const posted = parseDate(item.pubDate);
  const location = extractLabel(item.description, "Location");
  const description = htmlToText(item.description)
    .split("\n")
    .filter((line) => !/^\s*(?:Rate|Location):/i.test(line))
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim();
  const salary = parseSalary(item.description);

  return {
    job_id: item.guid || link || item.title,
    job_title: item.title,
    employer_name: source === "linkedin" ? "LinkedIn" : "JobServe",
    employer_logo: null,
    employer_website: source === "linkedin" ? "https://www.linkedin.com" : "https://www.jobserve.com",
    employer_company_type: null,
    employer_linkedin: null,
    job_publisher: source === "linkedin" ? "LinkedIn RSS" : "JobServe RSS",
    job_employment_type: "CONTRACTOR",
    job_apply_link: link,
    job_apply_is_direct: true,
    job_apply_quality_score: null,
    job_description: description,
    job_is_remote: /\bremote\b|\bhybrid\b/i.test(description),
    job_city: location,
    job_state: "",
    job_country: DEFAULT_COUNTRY,
    job_latitude: null,
    job_longitude: null,
    job_posted_at_timestamp: posted.timestamp,
    job_posted_at_datetime_utc: posted.iso,
    job_offer_expiration_datetime_utc: null,
    job_offer_expiration_timestamp: null,
    ...salary,
    job_benefits: null,
    job_google_link: null,
    job_required_experience: {
      no_experience_required: false,
      required_experience_in_months: null,
      experience_mentioned: false,
      experience_preferred: false,
    },
    job_required_skills: null,
    job_required_education: {
      postgraduate_degree: false,
      professional_certification: false,
      high_school: false,
      associates_degree: false,
      bachelors_degree: false,
      degree_mentioned: false,
      degree_preferred: false,
      professional_certification_mentioned: false,
    },
    job_experience_in_place_of_education: null,
    job_highlights: null,
    job_posting_language: null,
    job_onet_soc: null,
    job_onet_job_zone: null,
    job_occupational_categories: null,
    job_naics_code: null,
    job_naics_name: null,
    apply_options: [
      { publisher: source === "linkedin" ? "LinkedIn" : "JobServe", apply_link: link, is_direct: true },
    ],
  };
}

export class JobServeRssProvider implements JobSearchProvider {
  constructor(
    private readonly jobServeRssUrl?: string,
    private readonly linkedInRssUrl?: string,
  ) {}

  private async fetchRss(urlText: string): Promise<string> {
    const url = new URL(urlText);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported RSS feed URL");

    const response = await fetch(url.toString(), { headers: { "User-Agent": "Reactive Resume Job Search" } });
    if (!response.ok) throw new Error(`RSS error: ${response.status} ${response.statusText}`);
    return response.text();
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const jobs: JobResult[] = [];
    const errors: string[] = [];

    if (this.jobServeRssUrl) {
      try {
        const xml = await this.fetchRss(this.jobServeRssUrl);
        jobs.push(...parseItems(xml).map((item) => toJobResult(item, "jobserve")));
      } catch (error) {
        errors.push(`JobServe RSS failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    if (this.linkedInRssUrl) {
      try {
        const xml = await this.fetchRss(this.linkedInRssUrl);
        jobs.push(...parseItems(xml).map((item) => toJobResult(item, "linkedin")));
      } catch (error) {
        errors.push(`LinkedIn RSS failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    if (jobs.length === 0 && errors.length > 0) {
      throw new Error(errors.join(" | "));
    }

    const allJobs = jobs.filter((job) => matchesQuery(job, params.query));
    const page = params.page ?? 1;
    const perPage = (params.num_pages ?? RESULTS_PER_PAGE) * RESULTS_PER_PAGE;
    const offset = (page - 1) * perPage;

    return {
      status: "OK",
      request_id: `jobserve-rss-${Date.now()}`,
      parameters: { query: params.query, page: String(page) },
      data: allJobs.slice(offset, offset + perPage),
    };
  }

  async testConnection(): Promise<{ success: boolean }> {
    const hasJobServe = Boolean(this.jobServeRssUrl);
    const hasLinkedIn = Boolean(this.linkedInRssUrl);
    if (!hasJobServe && !hasLinkedIn) return { success: false };

    const [jobServe, linkedIn] = await Promise.all([
      hasJobServe
        ? this.fetchRss(this.jobServeRssUrl as string).then(() => true).catch(() => false)
        : Promise.resolve(false),
      hasLinkedIn
        ? this.fetchRss(this.linkedInRssUrl as string).then(() => true).catch(() => false)
        : Promise.resolve(false),
    ]);

    return { success: jobServe || linkedIn };
  }
}
