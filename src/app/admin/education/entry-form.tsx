"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import type { EducationEntry } from "@prisma/client";
import { createEducationEntry, updateEducationEntry, type EducationEntryFormState } from "./actions";

const initialState: EducationEntryFormState = {};

const emptyEntry = {
  institution: "",
  degree: "",
  field: "",
  startYear: "",
  endYear: "",
  description: null as string | null,
  achievements: [] as string[],
};

type Props = { mode: "create" } | { mode: "edit"; entry: EducationEntry };

export function EducationEntryForm(props: Props) {
  const entry = props.mode === "edit" ? props.entry : emptyEntry;
  const action =
    props.mode === "edit" ? updateEducationEntry.bind(null, props.entry.id) : createEducationEntry;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Education entry updated.");
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <AdminField
        label="Institution"
        name="institution"
        defaultValue={state.values?.institution ?? entry.institution}
        error={state.errors?.institution}
      />
      <AdminField
        label="Degree"
        name="degree"
        defaultValue={state.values?.degree ?? entry.degree}
        error={state.errors?.degree}
      />
      <AdminField
        label="Field of Study"
        name="field"
        defaultValue={state.values?.field ?? entry.field}
        error={state.errors?.field}
      />
      <AdminField
        label="Start Year"
        name="startYear"
        defaultValue={state.values?.startYear ?? entry.startYear}
        error={state.errors?.startYear}
      />
      <AdminField
        label="End Year"
        name="endYear"
        defaultValue={state.values?.endYear ?? entry.endYear}
        error={state.errors?.endYear}
      />
      <AdminField
        label="Description"
        name="description"
        defaultValue={state.values?.description ?? (entry.description ?? "")}
        error={state.errors?.description}
        textarea
        rows={3}
      />
      <AdminField
        label="Achievements (one per line)"
        name="achievements"
        defaultValue={state.values?.achievements ?? entry.achievements.join("\n")}
        error={state.errors?.achievements}
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
