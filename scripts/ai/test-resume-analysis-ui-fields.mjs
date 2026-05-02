#!/usr/bin/env node
import { writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testPath = resolve("scripts/ai/.tmp-resume-analysis-ui-fields.test.tsx");

const testSource = String.raw`import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { defaultResumeData } from "@/schema/resume/data";

const sampleAnalysis = vi.hoisted(() => ({
  overallScore: 81,
  updatedAt: new Date("2026-05-02T07:30:00.000Z"),
  modelMeta: {
    provider: "openrouter",
    model: "deepseek/deepseek-v4-flash",
  },
  atsCompatibility: {
    overallScore: 72,
    summary: "ATS compatibility is solid, with contractor-specific keyword and heading improvements available.",
    dimensions: [
      {
        dimension: "Structure",
        score: 82,
        rationale: "Core sections are present and use normal headings.",
        issues: ["One custom contractor section should use a plain ATS-friendly title."],
      },
      {
        dimension: "Keywords",
        score: 68,
        rationale: "Veteran programme delivery keywords are present but target-platform terms are sparse.",
        issues: ["Add exact role keywords such as data centre migration and supplier governance."],
      },
    ],
    recommendations: [
      "Use standard section headings for all contractor experience.",
      "Repeat the target role keywords naturally in summary, skills, and recent delivery bullets.",
    ],
  },
  scorecard: [
    {
      dimension: "Contractor Positioning",
      score: 84,
      rationale: "The CV clearly communicates senior delivery and infrastructure leadership.",
    },
  ],
  strengths: ["Strong senior contractor delivery narrative across infrastructure and data-centre programmes."],
  suggestions: [
    {
      title: "Add ATS target keywords to headline and summary",
      impact: "high",
      priority: "high",
      effort: "low",
      category: "ATS & Keywords",
      why: "Recruiters and ATS systems should see the target role language immediately.",
      exampleRewrite: "Infrastructure Programme Manager | Data Centre Migration | Supplier Governance",
      copyPrompt: "Update the headline and summary with data-centre and supplier-governance keywords.",
    },
    {
      title: "Quantify contractor delivery outcomes",
      impact: "medium",
      priority: "medium",
      effort: "medium",
      category: "Content Impact",
      why: "Metrics make senior contractor outcomes easier to shortlist.",
      exampleRewrite: null,
      copyPrompt: "Add measurable delivery outcomes to recent programme-management bullets.",
    },
  ],
}));

vi.mock("@lingui/core/macro", () => ({
  t: (input: TemplateStringsArray | { message?: string } | string, ...values: unknown[]) => {
    if (Array.isArray(input)) return String.raw({ raw: input }, ...values);
    if (typeof input === "object" && input && "message" in input) return input.message;
    return String(input);
  },
}));

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/integrations/orpc/client", () => ({
  orpc: {
    resume: {
      update: {
        call: vi.fn(async () => undefined),
      },
      analysis: {
        getById: {
          queryKey: ({ input }: { input: { id: string } }) => ["resume", "analysis", input.id],
          queryOptions: ({ input }: { input: { id: string } }) => ({
            queryKey: ["resume", "analysis", input.id],
            queryFn: async () => sampleAnalysis,
          }),
        },
      },
    },
    ai: {
      analyzeResume: {
        mutationOptions: () => ({ mutationFn: vi.fn() }),
      },
      applySuggestion: {
        mutationOptions: () => ({ mutationFn: vi.fn() }),
      },
    },
  },
}));

import { useAIStore } from "@/integrations/ai/store";
import { useResumeStore } from "@/components/resume/store/resume";
import { ResumeAnalysisSectionBuilder } from "@/routes/builder/$resumeId/-sidebar/right/sections/resume-analysis";

function textEquals(expected: string) {
  return (_: string, element: Element | null) => element?.textContent === expected;
}

function renderAnalysisSection() {
  useAIStore.setState({
    enabled: true,
    provider: "openrouter",
    model: "deepseek/deepseek-v4-flash",
    apiKey: "test-key",
    baseURL: "https://openrouter.ai/api/v1",
    testStatus: "success",
  });

  useResumeStore.getState().initialize({
    id: "resume-analysis-ui-test",
    name: "Resume Analysis UI Test",
    slug: "resume-analysis-ui-test",
    tags: [],
    isLocked: false,
    data: defaultResumeData,
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  queryClient.setQueryData(["resume", "analysis", "resume-analysis-ui-test"], sampleAnalysis);

  return render(
    <QueryClientProvider client={queryClient}>
      <ResumeAnalysisSectionBuilder />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  useResumeStore.getState().initialize(null);
  useAIStore.setState({ enabled: false, testStatus: "unverified" });
});

describe("resume analysis UI extended fields", () => {
  it("renders sample ATS compatibility, priority, effort, and category fields", async () => {
    renderAnalysisSection();

    expect(await screen.findByText("ATS Compatibility")).toBeDefined();
    expect(screen.getByText(sampleAnalysis.atsCompatibility.summary)).toBeDefined();
    expect(screen.getByText("Structure")).toBeDefined();
    expect(screen.getByText("Keywords")).toBeDefined();
    expect(screen.getByText("One custom contractor section should use a plain ATS-friendly title.")).toBeDefined();
    expect(screen.getByText("ATS Recommendations")).toBeDefined();
    expect(screen.getByText("Use standard section headings for all contractor experience.")).toBeDefined();

    expect(screen.getByText("Add ATS target keywords to headline and summary")).toBeDefined();
    expect(screen.getByText(textEquals("Impact: High"))).toBeDefined();
    expect(screen.getByText(textEquals("Priority: High"))).toBeDefined();
    expect(screen.getByText(textEquals("Effort: Low"))).toBeDefined();
    expect(screen.getByText("ATS & Keywords")).toBeDefined();

    expect(screen.getByText("Quantify contractor delivery outcomes")).toBeDefined();
    expect(screen.getByText(textEquals("Priority: Medium"))).toBeDefined();
    expect(screen.getByText(textEquals("Effort: Medium"))).toBeDefined();
    expect(screen.getByText("Content Impact")).toBeDefined();
  });
});
`;

writeFileSync(testPath, testSource);

const result = spawnSync("npm", ["test", "--", "--run", testPath], {
  stdio: "inherit",
  env: { ...process.env, VITEST: "1" },
});

if (!process.env.KEEP_UI_TEST) {
  try {
    unlinkSync(testPath);
  } catch {
    // Ignore cleanup failures; the test result is more important.
  }
}

if (result.error) throw result.error;
process.exit(result.status ?? 1);
