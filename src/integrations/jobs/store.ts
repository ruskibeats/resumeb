import type { WritableDraft } from "immer";

import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";

import type { RapidApiQuota } from "@/schema/jobs";

type TestStatus = "unverified" | "success" | "failure";

type JobsStoreState = {
  provider: "jsearch" | "jobserve-rss";
  rapidApiKey: string;
  jobServeRssUrl: string;
  linkedInRssUrl: string;
  testStatus: TestStatus;
  rapidApiQuota: RapidApiQuota | null;
};

type JobsStoreActions = {
  set: (fn: (draft: WritableDraft<JobsStoreState>) => void) => void;
  reset: () => void;
};

type JobsStore = JobsStoreState & JobsStoreActions;

const initialState: JobsStoreState = {
  provider: "jsearch",
  rapidApiKey: "",
  jobServeRssUrl: "",
  linkedInRssUrl: "",
  testStatus: "unverified",
  rapidApiQuota: null,
};

export const useJobsStore = create<JobsStore>()(
  persist(
    immer((set) => ({
      ...initialState,
      set: (fn) => {
        set((draft) => {
          const prev = { jobServeRssUrl: draft.jobServeRssUrl, linkedInRssUrl: draft.linkedInRssUrl, provider: draft.provider, rapidApiKey: draft.rapidApiKey };

          fn(draft);

          if (draft.rapidApiKey !== prev.rapidApiKey || draft.provider !== prev.provider || draft.jobServeRssUrl !== prev.jobServeRssUrl || draft.linkedInRssUrl !== prev.linkedInRssUrl) {
            draft.testStatus = "unverified";
          }
        });
      },
      reset: () => set(() => initialState),
    })),
    {
      name: "jobs-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        provider: state.provider,
        testStatus: state.testStatus,
        rapidApiKey: state.rapidApiKey,
        jobServeRssUrl: state.jobServeRssUrl,
        linkedInRssUrl: state.linkedInRssUrl,
        rapidApiQuota: state.rapidApiQuota,
      }),
    },
  ),
);
