import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, CheckCircleIcon, InfoIcon, LightningIcon, SparkleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { match } from "ts-pattern";

import { useResumeStore } from "@/components/resume/store/resume";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatchPreviewDialog } from "@/components/resume/patch-preview-dialog";
import { useAIStore } from "@/integrations/ai/store";
import { orpc } from "@/integrations/orpc/client";
import { getOrpcErrorMessage } from "@/utils/error-message";

import { SectionBase } from "../shared/section-base";
import { CoverLetterGenerator } from "./cover-letter-generator";

function impactCircleClass(impact: "high" | "medium" | "low") {
  return match(impact)
    .with("high", () => "bg-rose-600")
    .with("medium", () => "bg-amber-600")
    .with("low", () => "bg-emerald-600")
    .exhaustive();
}

function impactLabel(impact: "high" | "medium" | "low") {
  return match(impact)
    .with("high", () =>
      t({
        comment: "Impact severity label in resume analysis suggestion card",
        message: "High",
      }),
    )
    .with("medium", () =>
      t({
        comment: "Impact severity label in resume analysis suggestion card",
        message: "Medium",
      }),
    )
    .with("low", () =>
      t({
        comment: "Impact severity label in resume analysis suggestion card",
        message: "Low",
      }),
    )
    .exhaustive();
}

function levelBadgeClass(level: "high" | "medium" | "low") {
  return match(level)
    .with(
      "high",
      () => "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
    )
    .with(
      "medium",
      () => "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    )
    .with(
      "low",
      () =>
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    )
    .exhaustive();
}

function scoreToneClass(score: number | null | undefined) {
  if (score == null) return "bg-muted";
  if (score >= 80) return "bg-emerald-600";
  if (score >= 60) return "bg-amber-600";
  return "bg-rose-600";
}

export function ResumeAnalysisSectionBuilder() {
  const queryClient = useQueryClient();

  const resume = useResumeStore((state) => state.resume);
  const aiEnabled = useAIStore((state) => state.enabled);
  const aiProvider = useAIStore((state) => state.provider);
  const aiModel = useAIStore((state) => state.model);
  const aiApiKey = useAIStore((state) => state.apiKey);
  const aiBaseURL = useAIStore((state) => state.baseURL);

  const analysisQuery = useQuery(orpc.resume.analysis.getById.queryOptions({ input: { id: resume.id } }));

  // Preview dialog state
  const [previewState, setPreviewState] = useState<{
    operations: Array<Record<string, unknown>>;
    pendingApply: () => void;
  } | null>(null);

  const { mutate: analyzeResume, isPending } = useMutation({
    ...orpc.ai.analyzeResume.mutationOptions(),
    onSuccess: (analysis) => {
      queryClient.setQueryData(orpc.resume.analysis.getById.queryKey({ input: { id: resume.id } }), analysis);
      toast.success(t`Resume analysis complete.`);
    },
    onError: (error) => {
      toast.error(t`Failed to analyze resume.`, {
        description: getOrpcErrorMessage(error, {
          byCode: {
            BAD_REQUEST: t({
              comment: "Error description when AI returns invalid resume analysis format",
              message: "The AI returned an invalid analysis format. Please try again.",
            }),
            BAD_GATEWAY: t({
              comment: "Error description when AI provider cannot be reached during resume analysis",
              message: "Could not reach the AI provider. Please try again.",
            }),
          },
          fallback: t({
            comment: "Fallback error description when resume analysis request fails",
            message: "Something went wrong while analyzing your resume.",
          }),
        }),
      });
    },
  });

  const { mutate: applySuggestion, isPending: isApplying } = useMutation({
    ...orpc.ai.applySuggestion.mutationOptions(),
    onSuccess: (result) => {
      // Show preview dialog instead of directly applying
      setPreviewState({
        operations: result.operations,
        pendingApply: () => {
          const updateResumeData = useResumeStore.getState().updateResumeData;
          if (updateResumeData) {
            updateResumeData((draft) => {
              Object.assign(draft, result.resumeData);
            });
          }
          setPreviewState(null);
          toast.success(t`Suggestion applied. Re-analyse to see your new score.`);
        },
      });
    },
    onError: (error) => {
      setPreviewState(null);
      toast.error(t`Failed to apply suggestion.`, {
        description: getOrpcErrorMessage(error, {
          byCode: {
            BAD_GATEWAY: t({
              comment: "Error description when AI provider cannot be reached",
              message: "Could not reach the AI provider. Please try again.",
            }),
          },
          fallback: t({
            comment: "Fallback error description",
            message: "Something went wrong while applying the suggestion.",
          }),
        }),
      });
    },
  });

  const analysis = analysisQuery.data;
  const score = analysis?.overallScore ?? null;
  const analyzeLabel = isPending ? t`Analyzing...` : t`Analyze Resume`;

  const scoreTone = useMemo(() => scoreToneClass(score), [score]);

  const onAnalyze = () => {
    analyzeResume({
      provider: aiProvider,
      model: aiModel,
      apiKey: aiApiKey,
      baseURL: aiBaseURL,
      resumeId: resume.id,
      resumeData: resume.data,
    });
  };

  return (
    <SectionBase type="analysis" className="space-y-4">
      {!aiEnabled && <DisabledState />}

      {aiEnabled && (
        <>
          <div className="space-y-3">
            <div className="space-y-4 rounded-md border bg-card p-3">
              <div className="grid grid-cols-2 items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    <Trans>
                      Get a review of your resume with an overall score, strengths, and actionable suggestions.
                    </Trans>
                  </p>
                </div>

                <Button disabled={isPending} onClick={onAnalyze} className="ml-auto w-fit">
                  <SparkleIcon />
                  {analyzeLabel}
                </Button>
              </div>

              <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                <div
                  className={`grid size-18 place-items-center rounded-full border-3 border-background text-lg font-bold text-white ${scoreTone}`}
                >
                  {score ?? "--"}
                </div>

                <div className="space-y-3">
                  <p className="text-sm leading-none font-medium">
                    <Trans>Overall Score</Trans>
                  </p>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }).map((_, index) => {
                      const active = score != null && index < Math.round(score / 10);
                      return (
                        <div
                          key={index}
                          className={`h-1.5 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
                        />
                      );
                    })}
                  </div>
                  {analysis?.updatedAt && (
                    <p className="text-xs leading-none text-muted-foreground">
                      <Trans>Last analyzed on {new Date(analysis.updatedAt).toLocaleString()}</Trans>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <CoverLetterGenerator />

            {analysisQuery.isFetched && !analysis && !isPending && (
              <div className="rounded-md border border-dashed p-3">
                <p className="max-w-xs text-sm text-muted-foreground">
                  <Trans>Run your first analysis to get a scorecard, strengths, and prioritized suggestions.</Trans>
                </p>
              </div>
            )}

            {analysis && (
              <div className="space-y-4">
                {analysis.atsCompatibility && (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h5 className="flex items-center gap-2 text-sm font-semibold">
                          <LightningIcon className="text-primary" />
                          <Trans>ATS Compatibility</Trans>
                        </h5>
                        {analysis.atsCompatibility.summary && (
                          <p className="text-xs text-muted-foreground">{analysis.atsCompatibility.summary}</p>
                        )}
                      </div>

                      <div
                        className={`grid size-14 shrink-0 place-items-center rounded-full border-3 border-background text-sm font-bold text-white ${scoreToneClass(
                          analysis.atsCompatibility.overallScore,
                        )}`}
                        title={t`ATS compatibility score`}
                        aria-label={t`ATS compatibility score`}
                      >
                        {analysis.atsCompatibility.overallScore}
                      </div>
                    </div>

                    {analysis.atsCompatibility.dimensions && analysis.atsCompatibility.dimensions.length > 0 && (
                      <div className="space-y-2">
                        {analysis.atsCompatibility.dimensions.map((dimension, index) => (
                          <div
                            key={`${dimension.dimension}-${index}`}
                            className="space-y-2 rounded-md border bg-card p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-medium">{dimension.dimension}</div>
                              <Badge variant="secondary">{dimension.score}/100</Badge>
                            </div>
                            {dimension.rationale && (
                              <p className="text-xs text-muted-foreground">{dimension.rationale}</p>
                            )}
                            {dimension.issues && dimension.issues.length > 0 && (
                              <ul className="list-outside list-disc pl-4 text-xs text-muted-foreground">
                                {dimension.issues.map((issue, issueIndex) => (
                                  <li key={`${issue}-${issueIndex}`}>{issue}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis.atsCompatibility.recommendations &&
                      analysis.atsCompatibility.recommendations.length > 0 && (
                        <div className="space-y-2 rounded-md bg-muted p-2">
                          <p className="text-xs font-medium">
                            <Trans>ATS Recommendations</Trans>
                          </p>
                          <ul className="list-outside list-disc pl-4 text-xs text-muted-foreground">
                            {analysis.atsCompatibility.recommendations.map((recommendation, index) => (
                              <li key={`${recommendation}-${index}`}>{recommendation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                <div className="space-y-3 rounded-md border p-3">
                  <h5 className="flex items-center gap-2 text-sm font-semibold">
                    <LightningIcon className="text-primary" />
                    <Trans>Scorecard</Trans>
                  </h5>

                  <div className="space-y-3">
                    {analysis.scorecard.map((item, index) => (
                      <div key={`${item.dimension}-${index}`} className="space-y-3 rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">{item.dimension}</div>
                          <Badge variant="secondary">{item.score}/100</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {analysis.strengths.length > 0 && (
                  <div className="space-y-3 rounded-md border p-3">
                    <h5 className="text-sm font-semibold">
                      <Trans>Strengths</Trans>
                    </h5>

                    <ul className="list-outside list-disc pl-5 text-sm text-muted-foreground">
                      {analysis.strengths.map((strength, index) => (
                        <li key={`${strength}-${index}`} className="py-1.5">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.suggestions.length > 0 && (
                  <div className="space-y-4 rounded-md border p-3">
                    <h5 className="text-sm font-semibold">
                      <Trans>Suggestions</Trans>
                    </h5>

                    <div className="space-y-3">
                      {analysis.suggestions.map((suggestion, index) => (
                        <div key={`${suggestion.title}-${index}`} className="space-y-3 rounded-md border bg-card p-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span
                                role="img"
                                className={`size-2.5 shrink-0 rounded-full ring-1 ring-border ${impactCircleClass(suggestion.impact)}`}
                                title={impactLabel(suggestion.impact)}
                                aria-label={impactLabel(suggestion.impact)}
                              />
                              <div className="text-sm font-semibold tracking-tight">{suggestion.title}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary">
                                <Trans>Impact</Trans>: {impactLabel(suggestion.impact)}
                              </Badge>
                              {suggestion.priority && (
                                <Badge variant="outline" className={levelBadgeClass(suggestion.priority)}>
                                  <Trans>Priority</Trans>: {impactLabel(suggestion.priority)}
                                </Badge>
                              )}
                              {suggestion.effort && (
                                <Badge variant="outline">
                                  <Trans>Effort</Trans>: {impactLabel(suggestion.effort)}
                                </Badge>
                              )}
                              {suggestion.category && <Badge variant="outline">{suggestion.category}</Badge>}
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">{suggestion.why}</div>

                          {suggestion.evidence && (
                            <div className="rounded bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                              <strong>
                                <Trans>Evidence</Trans>:
                              </strong>{" "}
                              {suggestion.evidence}
                            </div>
                          )}

                          {suggestion.exampleRewrite && (
                            <div className="rounded bg-muted p-2 text-xs text-muted-foreground">
                              {suggestion.exampleRewrite}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isApplying}
                            onClick={() =>
                              applySuggestion({
                                provider: aiProvider,
                                model: aiModel,
                                apiKey: aiApiKey,
                                baseURL: aiBaseURL,
                                resumeData: resume.data,
                                prompt: suggestion.copyPrompt,
                              })
                            }
                            className="w-fit"
                          >
                            <CheckCircleIcon />
                            {isApplying ? t`Applying...` : t`Preview Changes`}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <PatchPreviewDialog
        open={!!previewState}
        onOpenChange={() => setPreviewState(null)}
        operations={previewState?.operations || []}
        onConfirm={previewState?.pendingApply || (() => {})}
        onCancel={() => setPreviewState(null)}
      />
    </SectionBase>
  );
}

function DisabledState() {
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="space-y-3">
        <p>
          <Trans>
            Get an in-depth AI-powered review of your resume with an overall score, key strengths, and practical
            suggestions. To activate this feature, please update your AI settings.
          </Trans>
        </p>

        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link to="/dashboard/settings/integrations">
              <Trans>Open Integrations Settings</Trans>
              <ArrowRightIcon />
            </Link>
          }
        />
      </AlertDescription>
    </Alert>
  );
}
