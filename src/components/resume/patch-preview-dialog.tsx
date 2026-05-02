import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

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

import { countOperations, getAffectedSections, getPatchDescription } from "@/utils/resume/diff";

type PatchPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: Array<Record<string, any>>;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PatchPreviewDialog({
  open,
  onOpenChange,
  operations,
  onConfirm,
  onCancel,
}: PatchPreviewDialogProps) {
  const [isApplying, setIsApplying] = useState(false);

  const changes = getPatchDescription(operations);
  const sections = getAffectedSections(operations);
  const counts = countOperations(operations);

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

          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <Trans>
                This operation uses JSON Patch (RFC 6902) to safely modify your resume. You can undo changes
                using the resume history feature.
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