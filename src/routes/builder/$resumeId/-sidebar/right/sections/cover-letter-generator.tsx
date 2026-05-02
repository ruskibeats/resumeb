import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ClipboardTextIcon, EnvelopeSimpleIcon, PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type { CoverLetter, CoverLetterTone } from "@/schema/cover-letter";

import { TiptapContent } from "@/components/input/rich-input";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAIStore } from "@/integrations/ai/store";
import { orpc } from "@/integrations/orpc/client";
import { getOrpcErrorMessage } from "@/utils/error-message";
import { generateId } from "@/utils/string";

const toneOptions: { value: CoverLetterTone; label: string }[] = [
  { value: "professional", label: t`Professional` },
  { value: "technical", label: t`Technical` },
  { value: "concise", label: t`Concise` },
  { value: "warm", label: t`Warm` },
];

export function CoverLetterGenerator() {
  const resume = useResumeStore((state) => state.resume);
  const updateResumeData = useResumeStore((state) => state.updateResumeData);
  const aiProvider = useAIStore((state) => state.provider);
  const aiModel = useAIStore((state) => state.model);
  const aiApiKey = useAIStore((state) => state.apiKey);
  const aiBaseURL = useAIStore((state) => state.baseURL);

  const [jobTitle, setJobTitle] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [hiringManager, setHiringManager] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);

  const { mutate: generateCoverLetter, isPending } = useMutation({
    ...orpc.ai.generateCoverLetter.mutationOptions(),
    onSuccess: (data) => {
      setCoverLetter(data);
      toast.success(t`Cover letter generated.`);
    },
    onError: (error) => {
      toast.error(t`Failed to generate cover letter.`, {
        description: getOrpcErrorMessage(error, {
          byCode: {
            BAD_GATEWAY: t({
              comment: "Error description when AI provider cannot be reached during cover letter generation",
              message: "Could not reach the AI provider. Please try again.",
            }),
            BAD_REQUEST: t({
              comment: "Error description when AI returns invalid cover letter format",
              message: "The AI returned an invalid cover letter format. Please try again.",
            }),
          },
          fallback: t({
            comment: "Fallback error description when cover letter generation request fails",
            message: "Something went wrong while generating the cover letter.",
          }),
        }),
      });
    },
  });

  const onGenerate = () => {
    generateCoverLetter({
      provider: aiProvider,
      model: aiModel,
      apiKey: aiApiKey,
      baseURL: aiBaseURL,
      resumeData: resume.data,
      target: {
        jobTitle,
        employerName,
        hiringManager,
        jobDescription,
      },
      tone,
      additionalInstructions,
    });
  };

  const onCopy = async () => {
    if (!coverLetter) return;

    await navigator.clipboard.writeText(coverLetter.plainText);
    toast.success(t`Cover letter copied to clipboard.`);
  };

  const onAddToResume = () => {
    if (!coverLetter) return;

    updateResumeData((draft) => {
      const item = {
        id: generateId(),
        hidden: false,
        recipient: coverLetter.recipient,
        content: coverLetter.content,
      };

      const existingSection = draft.customSections.find((section) => section.type === "cover-letter");
      if (existingSection) {
        existingSection.hidden = false;
        existingSection.items.push(item);
        return;
      }

      const sectionId = generateId();
      draft.customSections.push({
        id: sectionId,
        title: "Cover Letter",
        columns: 1,
        hidden: false,
        type: "cover-letter",
        items: [item],
      });

      const firstPage = draft.metadata.layout.pages[0];
      if (firstPage && !firstPage.main.includes(sectionId) && !firstPage.sidebar.includes(sectionId)) {
        firstPage.main.push(sectionId);
      }
    });

    toast.success(t`Cover letter added to your resume.`);
  };

  return (
    <div className="space-y-4 rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h5 className="flex items-center gap-2 text-sm font-semibold">
            <EnvelopeSimpleIcon className="text-primary" />
            <Trans>Cover Letter Generator</Trans>
          </h5>
          <p className="text-xs text-muted-foreground">
            <Trans>
              Create a truthful contractor-style cover letter from this resume. Paste a job description for the best
              result.
            </Trans>
          </p>
        </div>

        {coverLetter && (
          <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            <Trans>{coverLetter.wordCount} words</Trans>
          </div>
        )}
      </div>

      <div className="grid gap-3 @xl:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium">
          <Trans>Job title</Trans>
          <Input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder={t`Optional`} />
        </label>

        <label className="space-y-1.5 text-xs font-medium">
          <Trans>Employer</Trans>
          <Input
            value={employerName}
            onChange={(event) => setEmployerName(event.target.value)}
            placeholder={t`Optional`}
          />
        </label>

        <label className="space-y-1.5 text-xs font-medium">
          <Trans>Hiring manager</Trans>
          <Input
            value={hiringManager}
            onChange={(event) => setHiringManager(event.target.value)}
            placeholder={t`Optional`}
          />
        </label>

        <label className="space-y-1.5 text-xs font-medium">
          <Trans>Tone</Trans>
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value as CoverLetterTone)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {toneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-1.5 text-xs font-medium">
        <Trans>Job description</Trans>
        <Textarea
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          placeholder={t`Paste the job description or key requirements here.`}
          className="min-h-28"
        />
      </label>

      <label className="space-y-1.5 text-xs font-medium">
        <Trans>Additional instructions</Trans>
        <Textarea
          value={additionalInstructions}
          onChange={(event) => setAdditionalInstructions(event.target.value)}
          placeholder={t`Optional. For example: emphasise data centre delivery, keep it under 300 words.`}
          className="min-h-20"
        />
      </label>

      <Button disabled={isPending} onClick={onGenerate} className="w-fit">
        <SparkleIcon />
        {isPending ? t`Generating...` : t`Generate Cover Letter`}
      </Button>

      {coverLetter && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-3 rounded-md bg-background p-3 text-sm">
            {coverLetter.recipient && <TiptapContent content={coverLetter.recipient} />}
            <TiptapContent content={coverLetter.content} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onCopy}>
              <ClipboardTextIcon />
              <Trans>Copy text</Trans>
            </Button>
            <Button size="sm" variant="outline" onClick={onAddToResume}>
              <PlusIcon />
              <Trans>Add to resume</Trans>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
