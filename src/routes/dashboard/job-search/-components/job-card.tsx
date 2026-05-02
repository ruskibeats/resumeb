import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, BuildingsIcon, ClockIcon, GlobeIcon, MapPinIcon, MoneyIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";

import type { JobResult } from "@/schema/jobs";

import { Badge } from "@/components/ui/badge";

import { formatPostedDate, formatSalary } from "./job-utils";

type Props = {
  job: JobResult;
  onClick: () => void;
};

export function JobCard({ job, onClick }: Props) {
  const salary = formatSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency, job.job_salary_period);
  const posted = formatPostedDate(job.job_posted_at_timestamp);
  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ");

  return (
    <motion.button
      type="button"
      className="flex w-full cursor-pointer flex-col gap-y-3 rounded-md border bg-card p-4 text-start transition-colors hover:bg-accent/50"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-start gap-x-3">
        {job.employer_logo ? (
          <img src={job.employer_logo} alt={job.employer_name} className="size-10 shrink-0 rounded-md object-contain" />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <BuildingsIcon className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{job.job_title}</h3>
          <p className="truncate text-sm text-muted-foreground">{job.employer_name}</p>
          {job.job_publisher && (
            <span
              className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                job.job_publisher === "JobServe RSS"
                  ? "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400"
                  : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
              }`}
            >
              {job.job_publisher === "JobServe RSS" ? "JobServe" : "LinkedIn"}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {location && (
          <Badge variant="secondary" className="gap-x-1">
            <MapPinIcon className="size-3" />
            {location}
          </Badge>
        )}

        {job.job_is_remote && (
          <Badge variant="secondary" className="gap-x-1">
            <GlobeIcon className="size-3" />
            <Trans>Remote</Trans>
          </Badge>
        )}

        {job.job_employment_type && (
          <Badge variant="secondary" className="gap-x-1">
            <BriefcaseIcon className="size-3" />
            {job.job_employment_type.replaceAll("_", " ")}
          </Badge>
        )}

        {salary && (
          <Badge variant="secondary" className="gap-x-1">
            <MoneyIcon className="size-3" />
            {salary}
          </Badge>
        )}

        {posted && (
          <Badge variant="outline" className="gap-x-1">
            <ClockIcon className="size-3" />
            {posted}
          </Badge>
        )}
      </div>
    </motion.button>
  );
}
