import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { countOperations, getAffectedSections, getPatchDescription, type OperationPreview } from "@/utils/resume/diff";

type PatchPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: Array<Record<string, any>>;
  previews?: OperationPreview[];
  onConfirm: () => void;
  onCancel: () => void;
};

export function PatchPreviewDialog({
  open,
  onOpenChange,
  operations,
  previews,
  onConfirm,
  onCancel,
}: PatchPreviewDialogProps) {
  const [isApplying, setIsApplying] = useState(false);

  const changes = getPatchDescription(operations);
  const sections = getAffectedSections(operations);
  const counts = countOperations(operations);

  const previewSummary = useMemo(() => summarizePreviews(previews), [previews]);
  const visibilityPreview = useMemo(() => buildVisibilityPreview(previews), [previews]);
  const visiblePreviews = useMemo(() => {
    const raw = previews ?? [];
    // Collapse consecutive previews with identical after values into summary rows
    const collapsed: (OperationPreview & { count?: number })[] = [];
    for (const preview of raw) {
      const last = collapsed[collapsed.length - 1];
      if (last && last.after === preview.after && last.before === preview.before) {
        last.count = (last.count ?? 1) + 1;
      } else {
        collapsed.push({ ...preview });
      }
    }
    return collapsed.slice(0, 12);
  }, [previews]);
  const remainingPreviewCount = useMemo(() => {
    const shown = visiblePreviews.reduce((sum, p) => sum + (p.count ?? 1), 0);
    return Math.max((previews?.length ?? 0) - shown, 0);
  }, [visiblePreviews, previews]);

  const handleConfirm = async () => {
    setIsApplying(true);
    onConfirm();
  };

  const handleCancel = () => {
    setIsApplying(false);
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <Trans>Preview AI Suggestion</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Review the changes before applying them to your resume.</Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Trans>{counts.add} additions</Trans>
            </Badge>
            <Badge variant="secondary">
              <Trans>{counts.replace} modifications</Trans>
            </Badge>
            <Badge variant="secondary">
              <Trans>{counts.remove} removals</Trans>
            </Badge>
          </div>

          {sections.length > 0 && (
            <div>
              <p className="text-sm font-medium">
                <Trans>Affected sections</Trans>
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {sections.map((section) => (
                  <Badge key={section} variant="outline">
                    {section}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {previewSummary && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium">{previewSummary.title}</div>
              {previewSummary.description && <p className="mt-1 text-muted-foreground">{previewSummary.description}</p>}
            </div>
          )}

          {visibilityPreview ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                <Trans>Items to update</Trans>
              </p>

              {visibilityPreview.toVisible.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <EyeIcon className="size-4 text-emerald-600" />
                    <Trans>Make visible</Trans>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {visibilityPreview.toVisible.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {visibilityPreview.toHidden.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <EyeSlashIcon className="size-4 text-amber-600" />
                    <Trans>Hide</Trans>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {visibilityPreview.toHidden.map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : visiblePreviews.length > 0 ? (
            <div>
              <p className="text-sm font-medium">
                <Trans>Preview Changes</Trans>
              </p>
              <ScrollArea className="mt-1 max-h-72">
                <div className="space-y-2 pr-3">
                  {visiblePreviews.map((preview, index) => (
                    <div key={`${preview.path}-${index}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{preview.label}</div>
                        {preview.count && preview.count > 1 && (
                          <Badge variant="secondary" className="text-[10px]">×{preview.count}</Badge>
                        )}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                          {preview.before}
                        </div>
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          {preview.before === "Hidden" && preview.after === "Visible" ? (
                            <>
                              <EyeSlashIcon className="size-3.5" />
                              <ArrowRightIcon className="size-3.5" />
                              <EyeIcon className="size-3.5" />
                            </>
                          ) : (
                            <ArrowRightIcon className="size-3.5" />
                          )}
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                          {preview.after.length > 150 ? `${preview.after.substring(0, 150)}...` : preview.after}
                        </div>
                      </div>
                    </div>
                  ))}

                  {remainingPreviewCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <Trans>And {remainingPreviewCount} more changes.</Trans>
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">
                <Trans>Changes</Trans>
              </p>
              <ScrollArea className="mt-1 max-h-48">
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {changes.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <Trans>
                This operation uses JSON Patch (RFC 6902) to safely modify your resume. You can undo changes using the
                resume history feature.
              </Trans>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isApplying}>
            <XCircleIcon />
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleConfirm} disabled={isApplying}>
            <CheckCircleIcon />
            {isApplying ? t`Applying...` : t`Apply Changes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function summarizePreviews(previews?: OperationPreview[]) {
  if (!previews || previews.length === 0) return null;

  const visibilityPreviews = previews.filter((preview) => preview.label.endsWith(" visibility"));
  const allVisible = visibilityPreviews.length === previews.length;
  const toVisible = visibilityPreviews.filter((preview) => preview.before === "Hidden" && preview.after === "Visible");
  const toHidden = visibilityPreviews.filter((preview) => preview.before === "Visible" && preview.after === "Hidden");

  if (allVisible && toVisible.length === previews.length) {
    return {
      title: t`This will make ${previews.length} items visible.`,
      description: t`Hidden content will become visible on the final resume and more likely to be indexed by ATS systems.`,
    };
  }

  if (allVisible && toHidden.length === previews.length) {
    return {
      title: t`This will hide ${previews.length} items.`,
      description: t`Those items will no longer appear on the final resume.`,
    };
  }

  return null;
}

function buildVisibilityPreview(previews?: OperationPreview[]) {
  if (!previews || previews.length === 0) return null;

  const visibilityPreviews = previews.filter((preview) => preview.label.endsWith(" visibility"));
  if (visibilityPreviews.length !== previews.length) return null;

  const toVisible = visibilityPreviews
    .filter((preview) => preview.before === "Hidden" && preview.after === "Visible")
    .map((preview) => extractVisibilityItemLabel(preview.label));

  const toHidden = visibilityPreviews
    .filter((preview) => preview.before === "Visible" && preview.after === "Hidden")
    .map((preview) => extractVisibilityItemLabel(preview.label));

  return { toVisible, toHidden };
}

function extractVisibilityItemLabel(label: string) {
  return label.replace(/^.*?:\s*/, "").replace(/ visibility$/, "");
}
