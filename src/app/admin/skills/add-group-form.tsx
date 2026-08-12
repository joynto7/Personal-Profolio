"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import { createSkillGroup, type SkillGroupFormState } from "./actions";

const initialState: SkillGroupFormState = {};

export function AddGroupForm() {
  const [state, formAction, pending] = useActionState(createSkillGroup, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Group added.");
      formRef.current?.reset();
    }
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-end gap-3 rounded-xl border border-dashed border-border p-4"
    >
      <div className="flex-1">
        <AdminField
          label="New Group Category"
          name="category"
          defaultValue={state.values?.category ?? ""}
          error={state.errors?.category}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {pending ? "Adding..." : "Add Group"}
      </Button>
    </form>
  );
}
