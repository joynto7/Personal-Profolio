"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import type { ExperienceEntry } from "@prisma/client";
import { createExperienceEntry, updateExperienceEntry, type ExperienceEntryFormState } from "./actions";

const initialState: ExperienceEntryFormState = {};

const emptyEntry = {
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  description: "",
  highlights: [] as string[],
};

type Props = { mode: "create" } | { mode: "edit"; entry: ExperienceEntry };

export function ExperienceEntryForm(props: Props) {
  const entry = props.mode === "edit" ? props.entry : emptyEntry;
  const action =
    props.mode === "edit" ? updateExperienceEntry.bind(null, props.entry.id) : createExperienceEntry;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Experience entry updated.");
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <AdminField label="Company" name="company" defaultValue={entry.company} error={state.errors?.company} />
      <AdminField label="Role" name="role" defaultValue={entry.role} error={state.errors?.role} />
      <AdminField
        label="Start Date"
        name="startDate"
        defaultValue={entry.startDate}
        error={state.errors?.startDate}
      />
      <AdminField
        label="End Date"
        name="endDate"
        defaultValue={entry.endDate}
        error={state.errors?.endDate}
      />
      <AdminField
        label="Description"
        name="description"
        defaultValue={entry.description}
        error={state.errors?.description}
        textarea
        rows={3}
      />
      <AdminField
        label="Highlights (one per line)"
        name="highlights"
        defaultValue={entry.highlights.join("\n")}
        error={state.errors?.highlights}
        textarea
        rows={4}
      />

      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
