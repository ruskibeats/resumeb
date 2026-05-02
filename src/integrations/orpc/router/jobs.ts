import { ORPCError } from "@orpc/client";
import z from "zod";

import { postFilterOptionsSchema, searchParamsSchema } from "@/schema/jobs";

import { protectedProcedure } from "../context";
import { jobsSearchRateLimit, jobsTestConnectionRateLimit } from "../rate-limit";
import { jobsService } from "../services/jobs";

export const jobsRouter = {
  testConnection: protectedProcedure
    .route({
      method: "POST",
      path: "/jobs/test-connection",
      tags: ["Jobs"],
      operationId: "testJobsConnection",
      summary: "Test job source connection",
      description:
        "Tests connectivity to the configured job source (JSearch API or RSS feeds).",
      successDescription: "The job source is reachable.",
    })
    .input(
      z.object({
        apiKey: z.string().min(1).optional(),
        rssUrl: z.string().optional(),
        linkedInRssUrl: z.string().optional(),
      }),
    )
    .use(jobsTestConnectionRateLimit)
    .errors({
      BAD_GATEWAY: {
        message: "The job source returned an error or is unreachable.",
        status: 502,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await jobsService.testConnection(input.apiKey, {
          rssUrl: input.rssUrl,
          linkedInRssUrl: input.linkedInRssUrl,
        });
      } catch (error) {
        console.error("[jobs.testConnection] Failed to test job source:", error);
        throw new ORPCError("BAD_GATEWAY", {
          message: "The job source returned an error or is unreachable.",
        });
      }
    }),

  search: protectedProcedure
    .route({
      method: "POST",
      path: "/jobs/search",
      tags: ["Jobs"],
      operationId: "searchJobs",
      summary: "Search for job listings",
      description:
        "Searches for job listings from JSearch API or RSS feeds.",
      successDescription: "Job search results returned successfully.",
    })
    .input(
      z.object({
        apiKey: z.string().min(1).optional(),
        rssUrl: z.string().optional(),
        linkedInRssUrl: z.string().optional(),
        params: searchParamsSchema,
        filters: postFilterOptionsSchema.optional(),
      }),
    )
    .use(jobsSearchRateLimit)
    .errors({
      BAD_GATEWAY: {
        message: "The job source returned an error or is unreachable.",
        status: 502,
      },
    })
    .handler(async ({ input }) => {
      try {
        const response = await jobsService.search(input.apiKey, input.params, {
          rssUrl: input.rssUrl,
          linkedInRssUrl: input.linkedInRssUrl,
        });

        let jobs = jobsService.deduplicateJobs(response.data);

        if (input.filters) {
          jobs = jobsService.applyPostFilters(jobs, input.filters);
        }

        return { data: jobs, rapidApiQuota: response.rapidApiQuota };
      } catch (error) {
        console.error("[jobs.search] Failed to search jobs:", error);
        throw new ORPCError("BAD_GATEWAY", {
          message: "The job source returned an error or is unreachable.",
        });
      }
    }),
};
