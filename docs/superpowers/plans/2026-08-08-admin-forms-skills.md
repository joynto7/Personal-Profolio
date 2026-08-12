# Admin Forms — Skills (Plan 2c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship full create/edit/delete/reorder admin management for `SkillGroup` and the `Skill` rows nested inside each group, on a single `/admin/skills` page.

**Architecture:** Same Zod-schema → server-action → `AdminField`-based-form → `revalidatePath` pattern as Plans 2a/2b, but collapsed onto ONE route instead of list+detail pages, because `SkillGroup`/`Skill` fields are few and simple enough that a full edit page per row would be pure overhead. Every group and every skill renders as its own small `useActionState`-backed form directly in the list — save-in-place, no navigation. Reordering is the same ▲▼-swap-`order`-in-a-transaction pattern as Education/Experience, except `Skill.order` is scoped to its `groupId` (skills reorder only within their own group, not globally). The icon field is a native `<select>` over the existing fixed `ICONS` map in `src/lib/icons.ts` (Postgres can't store a React component, so `Skill.iconKey` is a string key resolved against that map at render time — this constraint predates this plan). No new UI components: native `<select>`/`<input type="checkbox">` styled to match the existing `Input` component's classes, since the UI kit has no Select or Checkbox component and one field each doesn't justify adding one.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), Zod, existing `Input`/`Button`/`AdminField`/`ConfirmDeleteForm` components, `sonner`, Prisma (`$transaction` for reorder swaps).

## Global Constraints

- No new dependencies.
- No new UI components — `<select>`/checkbox are plain HTML, hand-styled to match `Input`'s className (`h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30`).
- Icon options exclude the `social-*` keys in `ICONS` (`social-github`, `social-linkedin`) — those exist only for the `Social` model, not `Skill` (see the comment in `src/lib/icons.ts`).
- Every create/update action returns `values: raw as Record<string, string>` on both the validation-error and Prisma-failure paths (not on success) — this is the fix that Plan 2b's final review required retrofitting after the fact; build it in from the start this time. Every `useEffect` that fires a toast depends on `[state]` (the whole object), never individual fields — this was Plan 2b's other retrofitted bug; same reasoning applies verbatim here.
- `moveSkill`'s neighbor lookup is scoped to `{ groupId: current.groupId, ... }` — skills only reorder within their own group. `moveSkillGroup` has no such scoping (groups are a flat top-level list, like Education/Experience).
- Deleting a `SkillGroup` cascades to its `Skill` rows at the database level (`onDelete: Cascade` already on the schema) — the confirm message should say so explicitly so the admin isn't surprised.
- A Prisma failure in create/update returns `{message: "Could not save. Please try again."}`. A Prisma failure in delete/move is logged and rethrown (no state channel).
- `[id]`-style routes don't apply here (no detail pages), so there's no `Number.isInteger` guard needed — IDs are always bound server-side from an already-loaded row, never parsed from a URL segment.

---

### Task 1: Skill and SkillGroup Zod schemas

**Files:**
- Create: `src/lib/skill-group-schema.ts`
- Create: `src/lib/skill-schema.ts`

**Interfaces:**
- Produces: `skillGroupSchema`, `type SkillGroupFormValues`, `skillSchema`, `type SkillFormValues` — consumed by Task 2.

- [ ] **Step 1: Create `src/lib/skill-group-schema.ts`**

```ts
import { z } from "zod";

export const skillGroupSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(50),
});

export type SkillGroupFormValues = z.infer<typeof skillGroupSchema>;
```

- [ ] **Step 2: Create `src/lib/skill-schema.ts`**

`iconKey` is constrained to the actual keys in the `ICONS` map (excluding the two `social-*` keys, which exist only for the `Social` model) so an admin can never save a skill pointing at an icon that doesn't exist. `monochrome` is a checkbox: browsers send the literal string `"on"` when checked and omit the field entirely when unchecked, never `"off"` — `z.literal("on").optional()` models that exactly.

```ts
import { z } from "zod";
import { ICONS } from "@/lib/icons";

const skillIconKeys = Object.keys(ICONS).filter((key) => !key.startsWith("social-")) as [
  string,
  ...string[],
];

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  iconKey: z.enum(skillIconKeys, { message: "Select an icon" }),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color (e.g. #61DAFB)"),
  monochrome: z.literal("on").optional().transform((value) => value === "on"),
});

export type SkillFormValues = z.infer<typeof skillSchema>;
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/skill-group-schema.ts src/lib/skill-schema.ts
git commit -m "Add Zod schemas for the Skills admin form"
```

---

### Task 2: Skills server actions

**Files:**
- Create: `src/app/admin/skills/actions.ts`

**Interfaces:**
- Consumes: `skillGroupSchema`/`SkillGroupFormValues`, `skillSchema`/`SkillFormValues` from Task 1, `prisma` from `@/lib/prisma`.
- Produces: `createSkillGroup`, `updateSkillGroup`, `deleteSkillGroup`, `moveSkillGroup`, `createSkill`, `updateSkill`, `deleteSkill`, `moveSkill`, `type SkillGroupFormState`, `type SkillFormState` — consumed by Tasks 3-7.

- [ ] **Step 1: Create `src/app/admin/skills/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { skillGroupSchema } from "@/lib/skill-group-schema";
import { skillSchema } from "@/lib/skill-schema";

export type SkillGroupFormState = {
  errors?: Partial<Record<keyof typeof skillGroupSchema.shape, string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

export type SkillFormState = {
  errors?: Partial<Record<keyof typeof skillSchema.shape, string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function groupFieldErrors(error: z.ZodError) {
  const errors: SkillGroupFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof skillGroupSchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function skillFieldErrors(error: z.ZodError) {
  const errors: SkillFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof skillSchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function createSkillGroup(
  _prevState: SkillGroupFormState,
  formData: FormData
): Promise<SkillGroupFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillGroupSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: groupFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    const { _max } = await prisma.skillGroup.aggregate({ _max: { order: true } });
    await prisma.skillGroup.create({
      data: { ...parsed.data, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create skill group:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function updateSkillGroup(
  id: number,
  _prevState: SkillGroupFormState,
  formData: FormData
): Promise<SkillGroupFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillGroupSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: groupFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    await prisma.skillGroup.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update skill group:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSkillGroup(id: number) {
  try {
    await prisma.skillGroup.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete skill group:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function moveSkillGroup(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.skillGroup.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.skillGroup.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.skillGroup.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.skillGroup.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder skill group:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function createSkill(
  groupId: number,
  _prevState: SkillFormState,
  formData: FormData
): Promise<SkillFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: skillFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    const { _max } = await prisma.skill.aggregate({ where: { groupId }, _max: { order: true } });
    await prisma.skill.create({
      data: { ...parsed.data, groupId, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create skill:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function updateSkill(
  id: number,
  _prevState: SkillFormState,
  formData: FormData
): Promise<SkillFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = skillSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: skillFieldErrors(parsed.error), values: raw as Record<string, string> };
  }

  try {
    await prisma.skill.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update skill:", error);
    return { message: "Could not save. Please try again.", values: raw as Record<string, string> };
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSkill(id: number) {
  try {
    await prisma.skill.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete skill:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function moveSkill(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.skill.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.skill.findFirst({
        where:
          direction === "up"
            ? { groupId: current.groupId, order: { lt: current.order } }
            : { groupId: current.groupId, order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.skill.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.skill.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder skill:", error);
    throw error;
  }

  revalidatePath("/admin/skills");
  revalidatePath("/");
}
```

Note: `moveSkill`'s neighbor query includes `groupId: current.groupId` in both branches of the `where` clause — this is what keeps a skill from swapping `order` with a skill in a different group.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/skills/actions.ts
git commit -m "Add Skills server actions: group and skill create/update/delete/move"
```

---

### Task 3: `SkillRow` component

**Files:**
- Create: `src/app/admin/skills/skill-row.tsx`
- Modify: `src/components/admin/admin-field.tsx`

**Interfaces:**
- Consumes: `updateSkill`, `deleteSkill`, `moveSkill`, `SkillFormState` from Task 2; `AdminField` from `@/components/admin/admin-field`; `ConfirmDeleteForm` from `@/components/admin/confirm-delete-form` (takes `action`, `confirmMessage`, `entryLabel` — already shipped in Plan 2b).
- Produces: `<SkillRow skill isFirst isLast />` — consumed by Task 5. Also produces `AdminField`'s new optional `id` prop, consumed by Tasks 4 and 5.

**Why `admin-field.tsx` changes here:** `AdminField` currently hardcodes `id={name}` / `htmlFor={name}` / the error paragraph's `id={`${name}-error`}`. Every prior consumer (Profile, Education, Experience) only ever renders one instance of a given field name per page, so this was never a problem. Skills is different: this page renders one `AdminField` per skill per group, so multiple rows render `<AdminField name="name" />` and `<AdminField name="color" />` simultaneously — without a fix, every row after the first gets a duplicate `id`, breaking label-click association and screen-reader `aria-describedby` linkage for every row but the first. Add an optional `id` prop that defaults to `name` (so every existing call site — Profile, Education, Experience — is completely unaffected), and use it everywhere `AdminField` currently uses `name` for DOM ids.

- [ ] **Step 1: Modify `src/components/admin/admin-field.tsx`**

```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  id?: string;
};

export function AdminField({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  textarea = false,
  rows = 3,
  id,
}: AdminFieldProps) {
  const fieldId = id ?? name;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {textarea ? (
        <Textarea
          id={fieldId}
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      ) : (
        <Input
          id={fieldId}
          name={name}
          type={type}
          defaultValue={defaultValue}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      )}
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/skills/skill-row.tsx`**

```tsx
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
          id={`name-${skill.id}`}
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
          id={`color-${skill.id}`}
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
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/admin-field.tsx src/app/admin/skills/skill-row.tsx
git commit -m "Add optional id prop to AdminField and SkillRow component for the Skills admin page"
```

---

### Task 4: `AddSkillForm` component

**Files:**
- Create: `src/app/admin/skills/add-skill-form.tsx`

**Interfaces:**
- Consumes: `createSkill`, `SkillFormState` from Task 2; `AdminField`'s `id` prop from Task 3 (needed here too — one `AddSkillForm` renders per group, so without a unique `id` its `name`/`color` fields collide across groups the same way `SkillRow`'s did within a group).
- Produces: `<AddSkillForm groupId />` — consumed by Task 5.

- [ ] **Step 1: Create `src/app/admin/skills/add-skill-form.tsx`**

```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import { ICONS } from "@/lib/icons";
import { createSkill, type SkillFormState } from "./actions";

const initialState: SkillFormState = {};
const iconOptions = Object.keys(ICONS).filter((key) => !key.startsWith("social-"));

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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
          <p className="mt-1.5 text-xs text-destructive">{state.errors.iconKey}</p>
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/skills/add-skill-form.tsx
git commit -m "Add AddSkillForm component for the Skills admin page"
```

---

### Task 5: `GroupRow` component

**Files:**
- Create: `src/app/admin/skills/group-row.tsx`

**Interfaces:**
- Consumes: `updateSkillGroup`, `deleteSkillGroup`, `moveSkillGroup`, `SkillGroupFormState` from Task 2; `SkillRow` from Task 3 (also its `AdminField`'s `id` prop — one `GroupRow` renders per group, so its "Category" field needs a unique `id` the same way); `AddSkillForm` from Task 4; `ConfirmDeleteForm`.
- Produces: `<GroupRow group isFirst isLast />`, `type GroupWithSkills` — consumed by Task 7.

- [ ] **Step 1: Create `src/app/admin/skills/group-row.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/skills/group-row.tsx
git commit -m "Add GroupRow component for the Skills admin page"
```

---

### Task 6: `AddGroupForm` component

**Files:**
- Create: `src/app/admin/skills/add-group-form.tsx`

**Interfaces:**
- Consumes: `createSkillGroup`, `SkillGroupFormState` from Task 2.
- Produces: `<AddGroupForm />` — consumed by Task 7.

- [ ] **Step 1: Create `src/app/admin/skills/add-group-form.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/skills/add-group-form.tsx
git commit -m "Add AddGroupForm component for the Skills admin page"
```

---

### Task 7: Skills page

**Files:**
- Create: `src/app/admin/skills/page.tsx`

**Interfaces:**
- Consumes: `GroupRow`/`GroupWithSkills` from Task 5, `AddGroupForm` from Task 6, `prisma` from `@/lib/prisma`.
- Produces: `/admin/skills` route — consumed by Task 8 (dashboard link).

- [ ] **Step 1: Create `src/app/admin/skills/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GroupRow } from "./group-row";
import { AddGroupForm } from "./add-group-form";

export const metadata: Metadata = { title: "Skills — Admin" };

export default async function AdminSkillsPage() {
  const groups = await prisma.skillGroup.findMany({
    orderBy: { order: "asc" },
    include: { skills: { orderBy: { order: "asc" } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">Skills</h1>

      <div className="mt-8 flex flex-col gap-6">
        {groups.map((group, index) => (
          <GroupRow
            key={group.id}
            group={group}
            isFirst={index === 0}
            isLast={index === groups.length - 1}
          />
        ))}
        <AddGroupForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/skills/page.tsx
git commit -m "Add Skills admin page"
```

---

### Task 8: Link Skills from the dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `/admin/skills` from Task 7.

- [ ] **Step 1: Update the `sections` array in `src/app/admin/page.tsx`**

Change the Skills entry's `href` from `null` to `"/admin/skills"` — Projects and Case Studies stay `null`, since those routes still don't exist.

```tsx
  {
    label: "Skills",
    href: "/admin/skills",
    description: "Skill groups and the entries inside them",
  },
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "Link Skills from the admin dashboard"
```

---

### Task 9: Full verification pass

**Files:** none (verification only, unless a fix is needed).

- [ ] **Step 1: Typecheck, lint, build**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run lint` — expect 0 errors.
Run: `npm run build` — expect success; `/admin/skills` should appear in the route table as `ƒ` dynamic.

- [ ] **Step 2: Manual browser pass**

With the dev server running and `ADMIN_PASSWORD` set:
- Visit `/admin`, confirm "Skills" is now a clickable link.
- Click into `/admin/skills` — confirm existing groups and skills render with the right values pre-filled (name, icon, color swatch value, monochrome checkbox state).
- In an existing group, edit a skill's name and Save — confirm a success toast and the change is reflected on reload.
- Submit a skill edit with an invalid hex color (e.g. `notacolor`) — confirm an inline error appears under Color and nothing was saved; confirm the other fields you'd changed in that same submission are NOT wiped (the `state.values` echo).
- Use "Add Skill" on a group with a duplicate/blank name to trigger a validation error, then fill it in correctly and confirm it appears at the end of that group's skill list.
- Move a skill up/down within its group — confirm it reorders and does NOT affect skills in a different group.
- Delete a skill (cancel then confirm) — confirm cancel does nothing and confirm removes it.
- Use "Add Group" to create a new group, confirm it appears at the end of the group list.
- Move the new group up/down — confirm group-level reordering works independently of skill-level reordering.
- Delete the new group (with at least one skill in it) — confirm the confirm message mentions the skill count, and confirming removes the group AND its skills (cascade).
- Visit `/` (public homepage) — confirm the Skills section reflects all changes with no rebuild needed, then revert any test data changes so the live site matches what it looked like before this check.

- [ ] **Step 3: Commit (only if a fix was needed)**

```bash
git add [exact files fixed]
git commit -m "Fix [specific issue] found in Skills admin verification"
```
