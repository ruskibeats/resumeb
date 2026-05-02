import { describe, expect, it } from "vite-plus/test";

import { JSearchProvider } from "./providers/jsearch";
import { JobServeRssProvider } from "./providers/jobserve-rss";
import { createJobSearchProvider } from "./factory";

describe("createJobSearchProvider", () => {
  it("creates JSearch by default with API key", () => {
    expect(createJobSearchProvider("test-api-key")).toBeInstanceOf(JSearchProvider);
  });

  it("creates JSearch when no RSS URLs are provided", () => {
    expect(createJobSearchProvider("test-api-key", {})).toBeInstanceOf(JSearchProvider);
  });

  it("creates JobServe RSS provider when jobServeRssUrl is provided", () => {
    const provider = createJobSearchProvider("", { jobServeRssUrl: "https://www.jobserve.com/MySearch/example.rss" });

    expect(provider).toBeInstanceOf(JobServeRssProvider);
  });

  it("creates JobServe RSS provider when linkedInRssUrl is provided", () => {
    const provider = createJobSearchProvider("", { linkedInRssUrl: "https://www.linkedin.com/jobs/rss" });

    expect(provider).toBeInstanceOf(JobServeRssProvider);
  });

  it("creates JobServe RSS provider when both RSS URLs are provided", () => {
    const provider = createJobSearchProvider("", {
      jobServeRssUrl: "https://www.jobserve.com/MySearch/example.rss",
      linkedInRssUrl: "https://www.linkedin.com/jobs/rss",
    });

    expect(provider).toBeInstanceOf(JobServeRssProvider);
  });
});