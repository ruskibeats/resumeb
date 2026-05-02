import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useJobsStore } from "@/integrations/jobs/store";
import { orpc } from "@/integrations/orpc/client";

function JobSearchSourceForm() {
  const { jobServeRssUrl, linkedInRssUrl } = useJobsStore();
  const set = useJobsStore((state) => state.set);

  const { mutate: testConnection } = useMutation(orpc.jobs.testConnection.mutationOptions());

  const [jobserveStatus, setJobserveStatus] = useState<"idle" | "testing" | "success" | "failure">("idle");
  const [linkedinStatus, setLinkedinStatus] = useState<"idle" | "testing" | "success" | "failure">("idle");

  const testJobServe = () => {
    setJobserveStatus("testing");
    testConnection(
      { rssUrl: jobServeRssUrl },
      {
        onSuccess: (data) => setJobserveStatus(data.success ? "success" : "failure"),
        onError: () => {
          setJobserveStatus("failure");
          toast.error(t`Could not reach JobServe RSS feed. Check the URL and try again.`);
        },
      },
    );
  };

  const testLinkedIn = () => {
    setLinkedinStatus("testing");
    testConnection(
      { linkedInRssUrl },
      {
        onSuccess: (data) => setLinkedinStatus(data.success ? "success" : "failure"),
        onError: () => {
          setLinkedinStatus("failure");
          toast.error(t`Could not reach LinkedIn RSS feed. Check the URL and try again.`);
        },
      },
    );
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="jobserve-rss-url">
          <Trans>JobServe RSS URL</Trans>
        </Label>

        <div className="flex gap-2">
          <Input
            id="jobserve-rss-url"
            name="jobserve-rss-url"
            type="url"
            value={jobServeRssUrl}
            onChange={(e) =>
              set((draft) => {
                draft.jobServeRssUrl = e.target.value;
              })
            }
            placeholder="https://www.jobserve.com/MySearch/....rss"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
            autoCapitalize="off"
            className="flex-1"
          />

          <Button
            variant="outline"
            disabled={jobserveStatus === "testing" || !jobServeRssUrl}
            onClick={testJobServe}
          >
            {jobserveStatus === "testing" ? (
              <Spinner />
            ) : jobserveStatus === "success" ? (
              <CheckCircleIcon className="text-success" />
            ) : jobserveStatus === "failure" ? (
              <XCircleIcon className="text-destructive" />
            ) : null}
            <Trans>Test</Trans>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="linkedin-rss-url">
          <Trans>LinkedIn RSS URL</Trans>
        </Label>

        <div className="flex gap-2">
          <Input
            id="linkedin-rss-url"
            name="linkedin-rss-url"
            type="url"
            value={linkedInRssUrl}
            onChange={(e) =>
              set((draft) => {
                draft.linkedInRssUrl = e.target.value;
              })
            }
            placeholder="http://localhost:9099/feed"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
            autoCapitalize="off"
            className="flex-1"
          />

          <Button
            variant="outline"
            disabled={linkedinStatus === "testing" || !linkedInRssUrl}
            onClick={testLinkedIn}
          >
            {linkedinStatus === "testing" ? (
              <Spinner />
            ) : linkedinStatus === "success" ? (
              <CheckCircleIcon className="text-success" />
            ) : linkedinStatus === "failure" ? (
              <XCircleIcon className="text-destructive" />
            ) : null}
            <Trans>Test</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function JobSearchSettingsSection() {
  return (
    <section className="grid gap-6">
      <h2 className="text-xl font-semibold">
        <Trans>Job Search</Trans>
      </h2>

      <JobSearchSourceForm />
    </section>
  );
}
