"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import { SKILL_ICON_KEYS } from "@/lib/icons";
import { createSkill, type SkillFormState } from "./actions";

const initialState: SkillFormState = {};
const iconOptions = SKILL_ICON_KEYS;

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function AddSkillForm({ groupId }: { groupId: number }) {
  const [state, formAction, pending] = useActionState(createSkill.bind(null, groupId), initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Skill added.");
      formRef.current?.reset();
    }
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-4"
    >
      <AdminField
        label="Name"
        name="name"
        id={`new-name-${groupId}`}
        defaultValue={state.values?.name ?? ""}
        error={state.errors?.name}
      />
      <div>
        <label
          htmlFor={`new-iconKey-${groupId}`}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Icon
        </label>
        <select
          id={`new-iconKey-${groupId}`}
          name="iconKey"
          defaultValue={state.values?.iconKey ?? ""}
          className={selectClassName}
          aria-invalid={!!state.errors?.iconKey}
          aria-describedby={state.errors?.iconKey ? `new-iconKey-${groupId}-error` : undefined}
        >
          <option value="" disabled>
            Select an icon
          </option>
          {iconOptions.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        {state.errors?.iconKey && (
          <p id={`new-iconKey-${groupId}-error`} className="mt-1.5 text-xs text-destructive">
            {state.errors.iconKey}
          </p>
        )}
      </div>
      <AdminField
        label="Color"
        name="color"
        id={`new-color-${groupId}`}
        defaultValue={state.values?.color ?? "#000000"}
        error={state.errors?.color}
      />
      <div>
        <label
          htmlFor={`new-monochrome-${groupId}`}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Monochrome
        </label>
        <input
          id={`new-monochrome-${groupId}`}
          name="monochrome"
          type="checkbox"
          defaultChecked={state.values?.monochrome === "on"}
          className="size-4 rounded border-input"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="col-span-2 self-end sm:col-span-4">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {pending ? "Adding..." : "Add Skill"}
      </Button>
    </form>
  );
}
