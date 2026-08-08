"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import type { Skill } from "@prisma/client";
import { ICONS } from "@/lib/icons";
import { deleteSkill, moveSkill, updateSkill, type SkillFormState } from "./actions";

const initialState: SkillFormState = {};
const iconOptions = Object.keys(ICONS).filter((key) => !key.startsWith("social-"));

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type Props = {
  skill: Skill;
  isFirst: boolean;
  isLast: boolean;
};

export function SkillRow({ skill, isFirst, isLast }: Props) {
  const [state, formAction, pending] = useActionState(updateSkill.bind(null, skill.id), initialState);

  useEffect(() => {
    if (state.success) toast.success("Skill updated.");
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <form action={formAction} className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminField
          label="Name"
          name="name"
          defaultValue={state.values?.name ?? skill.name}
          error={state.errors?.name}
        />
        <div>
          <label
            htmlFor={`iconKey-${skill.id}`}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Icon
          </label>
          <select
            id={`iconKey-${skill.id}`}
            name="iconKey"
            defaultValue={state.values?.iconKey ?? skill.iconKey}
            className={selectClassName}
          >
            {iconOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {state.errors?.iconKey && (
            <p className="mt-1.5 text-xs text-destructive">{state.errors.iconKey}</p>
          )}
        </div>
        <AdminField
          label="Color"
          name="color"
          defaultValue={state.values?.color ?? skill.color}
          error={state.errors?.color}
        />
        <div>
          <label
            htmlFor={`monochrome-${skill.id}`}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Monochrome
          </label>
          <input
            id={`monochrome-${skill.id}`}
            name="monochrome"
            type="checkbox"
            defaultChecked={state.values ? state.values.monochrome === "on" : skill.monochrome}
            className="size-4 rounded border-input"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="col-span-2 self-end sm:col-span-4">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
      <div className="flex shrink-0 flex-col items-center gap-1">
        {!isFirst && (
          <form action={moveSkill.bind(null, skill.id, "up")}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${skill.name} up`}>
              <ArrowUp className="size-4" />
            </Button>
          </form>
        )}
        {!isLast && (
          <form action={moveSkill.bind(null, skill.id, "down")}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${skill.name} down`}>
              <ArrowDown className="size-4" />
            </Button>
          </form>
        )}
        <ConfirmDeleteForm
          action={deleteSkill.bind(null, skill.id)}
          confirmMessage={`Delete the skill "${skill.name}"?`}
          entryLabel={skill.name}
        />
      </div>
    </div>
  );
}
