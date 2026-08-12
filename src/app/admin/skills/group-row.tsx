"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import type { Prisma } from "@prisma/client";
import { deleteSkillGroup, moveSkillGroup, updateSkillGroup, type SkillGroupFormState } from "./actions";
import { SkillRow } from "./skill-row";
import { AddSkillForm } from "./add-skill-form";

const initialState: SkillGroupFormState = {};

export type GroupWithSkills = Prisma.SkillGroupGetPayload<{ include: { skills: true } }>;

type Props = {
  group: GroupWithSkills;
  isFirst: boolean;
  isLast: boolean;
};

export function GroupRow({ group, isFirst, isLast }: Props) {
  const [state, formAction, pending] = useActionState(updateSkillGroup.bind(null, group.id), initialState);

  useEffect(() => {
    if (state.success) toast.success("Group updated.");
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-end gap-3">
        <form action={formAction} className="flex flex-1 items-end gap-3">
          <div className="flex-1">
            <AdminField
              label="Category"
              name="category"
              id={`category-${group.id}`}
              defaultValue={state.values?.category ?? group.category}
              error={state.errors?.category}
            />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </form>
        <div className="flex shrink-0 items-center gap-1">
          {!isFirst && (
            <form action={moveSkillGroup.bind(null, group.id, "up")}>
              <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${group.category} up`}>
                <ArrowUp className="size-4" />
              </Button>
            </form>
          )}
          {!isLast && (
            <form action={moveSkillGroup.bind(null, group.id, "down")}>
              <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${group.category} down`}>
                <ArrowDown className="size-4" />
              </Button>
            </form>
          )}
          <ConfirmDeleteForm
            action={deleteSkillGroup.bind(null, group.id)}
            confirmMessage={`Delete the "${group.category}" group and all ${group.skills.length} skill(s) in it? This cannot be undone.`}
            entryLabel={group.category}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {group.skills.map((skill, index) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            isFirst={index === 0}
            isLast={index === group.skills.length - 1}
          />
        ))}
        <AddSkillForm groupId={group.id} />
      </div>
    </div>
  );
}
