"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDeleteFormProps = {
  action: () => Promise<void>;
  confirmMessage: string;
  entryLabel: string;
};

export function ConfirmDeleteForm({ action, confirmMessage, entryLabel }: ConfirmDeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Delete ${entryLabel}`}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </form>
  );
}
