import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { JobServeRssProvider } from "./jobserve-rss";

const mockFetch = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>();
global.fetch = mockFetch as never;

function mockOkXml(xml: string) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => xml,
  };
}

function mockErrorResponse(status: number, statusText: string) {
  return {
    ok: false,
    status,
    statusText,
    text: async () => "",
  };
}

const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel><title>JobServe Search Results</title>
  <item>
    <title>(IT) Senior Project Manager</title>
    <link>http://www.jobserve.com/us/en/RC1C4B7D0C0473800DD.jsap</link>
    <description>&lt;br/&gt;&lt;span style="font-weight: bold;"&gt;Rate:&lt;/span&gt; Up to £700 per day&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;span style="font-weight: bold;"&gt;Location:&lt;/span&gt; Basingstoke&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;br/&gt;&lt;br/&gt;Senior Project Manager Must have an Active DV Clearance.</description>
    <guid>http://www.jobserve.com/us/en/RC1C4B7D0C0473800DD.jsap</guid>
    <pubDate>Wed, 29 Apr 2026 18:19:46 GMT</pubDate>
  </item>
  <item>
    <title>Finance Manager</title>
    <link>https://www.jobserve.com/job2</link>
    <description>&lt;span&gt;Rate:&lt;/span&gt; £400 - £500 per day&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;span&gt;Location:&lt;/span&gt; London&amp;nbsp;&amp;nbsp;&amp;nbsp;Finance change role.</description>
    <guid>job-2</guid>
    <pubDate>Wed, 29 Apr 2026 10:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe("JobServeRssProvider", () => {
  let provider: JobServeRssProvider;

  beforeEach(() => {
    provider = new JobServeRssProvider("https://www.jobserve.com/MySearch/example.rss");
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches RSS and maps items to JobResult records", async () => {
    mockFetch.mockResolvedValueOnce(mockOkXml(rss));

    const result = await provider.search({ query: "project", num_pages: 1 });

    expect(mockFetch).toHaveBeenCalledWith("https://www.jobserve.com/MySearch/example.rss", {
      headers: { "User-Agent": "Reactive Resume Job Search" },
    });
    expect(result.status).toBe("OK");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      job_id: "http://www.jobserve.com/us/en/RC1C4B7D0C0473800DD.jsap",
      job_title: "(IT) Senior Project Manager",
      employer_name: "JobServe",
      job_publisher: "JobServe RSS",
      job_apply_link: "http://www.jobserve.com/us/en/RC1C4B7D0C0473800DD.jsap",
      job_city: "Basingstoke",
      job_country: "GB",
      job_max_salary: 700,
      job_salary_currency: "GBP",
      job_salary_period: "DAY",
    });
    expect(result.data[0].job_description).toContain("Senior Project Manager Must have an Active DV Clearance.");
    expect(result.data[0].job_posted_at_timestamp).toBeGreaterThan(0);
  });

  it("supports range rates from RSS descriptions", async () => {
    mockFetch.mockResolvedValueOnce(mockOkXml(rss));

    const result = await provider.search({ query: "finance", num_pages: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].job_min_salary).toBe(400);
    expect(result.data[0].job_max_salary).toBe(500);
    expect(result.data[0].job_salary_currency).toBe("GBP");
    expect(result.data[0].job_salary_period).toBe("DAY");
  });

  it("paginates mapped RSS results in ten-job pages", async () => {
    const items = Array.from(
      { length: 11 },
      (_, index) => `
        <item>
          <title>Project Manager ${index + 1}</title>
          <link>https://www.jobserve.com/job-${index + 1}</link>
          <description>&lt;span&gt;Location:&lt;/span&gt; London&lt;br/&gt;Project role ${index + 1}</description>
          <guid>job-${index + 1}</guid>
          <pubDate>Wed, 29 Apr 2026 10:00:00 GMT</pubDate>
        </item>`,
    ).join("");
    mockFetch.mockResolvedValueOnce(mockOkXml(`<rss><channel>${items}</channel></rss>`));

    const result = await provider.search({ query: "project", page: 2, num_pages: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].job_title).toBe("Project Manager 11");
  });

  it("returns success false when the RSS feed cannot be fetched", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(404, "Not Found"));

    const result = await provider.testConnection();

    expect(result.success).toBe(false);
  });
});
