# Admin Forms — Education & Experience (Plan 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship full create/edit/delete/reorder admin forms for the `EducationEntry` and `ExperienceEntry` lists, reusing the Zod-schema → server-action → `AdminField` pattern from Plan 2a, extended with list-specific CRUD.

**Architecture:** One Zod schema, one `actions.ts` (create/update/delete/move), one shared client `entry-form.tsx`, and three routes (`page.tsx` list, `new/page.tsx`, `[id]/page.tsx`) per entity — built once for Education, then repeated identically for Experience. One new shared component, `ConfirmDeleteForm`, used by both list pages. No shared abstraction between Education and Experience themselves — their field sets differ enough that forcing one would cost more than it saves.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), Zod, existing `Input`/`Textarea`/`Button` UI components, `sonner` for toasts, Prisma (`$transaction` for the reorder swap).

## Global Constraints

- No new dependencies — Zod, the UI components, `sonner`, and Prisma are all already installed.
- Every admin form follows the exact pattern established in Plan 2a (Zod schema → server action → `AdminField`-based form → `revalidatePath`); this plan does not deviate from it.
- Reordering is ▲▼ buttons swapping `order` with the adjacent row — no drag-and-drop, no new dependency.
- Array fields (`achievements`, `highlights`) are a single `Textarea`, one item per line — the Zod schema does the split/trim/filter-blank transform.
- Delete is confirmed with native `window.confirm()` — no dialog component.
- Create redirects to the list page on success (via `redirect()`, called after the try/catch so the redirect's internal throw is never accidentally caught). Edit stays on the page with a toast, exactly like `updateProfile`.
- A Prisma failure in create/update returns `{message: "Could not save. Please try again."}` for the existing toast pattern. A Prisma failure in delete/move has no state channel, so it's logged and rethrown rather than swallowed.

---

### Task 1: Shared `ConfirmDeleteForm` component

**Files:**
- Create: `src/components/admin/confirm-delete-form.tsx`

**Interfaces:**
- Produces: `<ConfirmDeleteForm action confirmMessage />` — consumed by Task 5 (Education list page) and Task 9 (Experience list page).

- [ ] **Step 1: Create `src/components/admin/confirm-delete-form.tsx`**

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDeleteFormProps = {
  action: () => Promise<void>;
  confirmMessage: string;
};

export function ConfirmDeleteForm({ action, confirmMessage }: ConfirmDeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
        <Trash2 className="size-4 text-destructive" />
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
git add src/components/admin/confirm-delete-form.tsx
git commit -m "Add shared ConfirmDeleteForm component for admin list pages"
```

---

### Task 2: Education Zod schema

**Files:**
- Create: `src/lib/education-schema.ts`

**Interfaces:**
- Produces: `educationEntrySchema`, `type EducationEntryFormValues` — consumed by Task 3.

- [ ] **Step 1: Create `src/lib/education-schema.ts`**

`description` is optional (`String?` on the model) so it's normalized to `null` when blank instead of an empty string. `achievements` is a `Textarea`'s raw newline-separated string on the way in, transformed into `string[]` for Prisma.

```ts
import { z } from "zod";

export const educationEntrySchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(150),
  degree: z.string().trim().min(1, "Degree is required").max(150),
  field: z.string().trim().min(1, "Field of study is required").max(150),
  startYear: z.string().trim().min(1, "Start year is required").max(20),
  endYear: z.string().trim().min(1, "End year is required").max(20),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value)),
  achievements: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
});

export type EducationEntryFormValues = z.infer<typeof educationEntrySchema>;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/education-schema.ts
git commit -m "Add Zod schema for the Education admin form"
```

---

### Task 3: Education server actions

**Files:**
- Create: `src/app/admin/education/actions.ts`

**Interfaces:**
- Consumes: `educationEntrySchema`/`EducationEntryFormValues` from Task 2, `prisma` from `@/lib/prisma`.
- Produces: `createEducationEntry`, `updateEducationEntry`, `deleteEducationEntry`, `moveEducationEntry`, `type EducationEntryFormState` — consumed by Task 4 and Task 5.

- [ ] **Step 1: Create `src/app/admin/education/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { educationEntrySchema } from "@/lib/education-schema";

export type EducationEntryFormState = {
  errors?: Partial<Record<keyof typeof educationEntrySchema.shape, string>>;
  success?: boolean;
  message?: string;
};

function fieldErrors(error: z.ZodError) {
  const errors: EducationEntryFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof educationEntrySchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function createEducationEntry(
  _prevState: EducationEntryFormState,
  formData: FormData
): Promise<EducationEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = educationEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    const { _max } = await prisma.educationEntry.aggregate({ _max: { order: true } });
    await prisma.educationEntry.create({
      data: { ...parsed.data, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create education entry:", error);
    return { message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
  redirect("/admin/education");
}

export async function updateEducationEntry(
  id: number,
  _prevState: EducationEntryFormState,
  formData: FormData
): Promise<EducationEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = educationEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    await prisma.educationEntry.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update education entry:", error);
    return { message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
  return { success: true };
}

export async function deleteEducationEntry(id: number) {
  try {
    await prisma.educationEntry.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete education entry:", error);
    throw error;
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
}

export async function moveEducationEntry(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.educationEntry.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.educationEntry.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.educationEntry.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.educationEntry.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder education entry:", error);
    throw error;
  }

  revalidatePath("/admin/education");
  revalidatePath("/");
}
```

Note: `redirect()` in `createEducationEntry` is called after the `try/catch` block, not inside it — `redirect()` works by throwing, and catching that throw would break the redirect.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/education/actions.ts
git commit -m "Add Education server actions: create, update, delete, move"
```

---

### Task 4: Education entry form

**Files:**
- Create: `src/app/admin/education/entry-form.tsx`

**Interfaces:**
- Consumes: `AdminField` from `@/components/admin/admin-field`, `createEducationEntry`/`updateEducationEntry`/`EducationEntryFormState` from Task 3.
- Produces: `<EducationEntryForm mode="create" />` / `<EducationEntryForm mode="edit" entry={entry} />` — consumed by Task 5.

- [ ] **Step 1: Create `src/app/admin/education/entry-form.tsx`**

```tsx
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
  }, [state.success, state.message]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <AdminField
        label="Institution"
        name="institution"
        defaultValue={entry.institution}
        error={state.errors?.institution}
      />
      <AdminField label="Degree" name="degree" defaultValue={entry.degree} error={state.errors?.degree} />
      <AdminField
        label="Field of Study"
        name="field"
        defaultValue={entry.field}
        error={state.errors?.field}
      />
      <AdminField
        label="Start Year"
        name="startYear"
        defaultValue={entry.startYear}
        error={state.errors?.startYear}
      />
      <AdminField
        label="End Year"
        name="endYear"
        defaultValue={entry.endYear}
        error={state.errors?.endYear}
      />
      <AdminField
        label="Description"
        name="description"
        defaultValue={entry.description ?? ""}
        error={state.errors?.description}
        textarea
        rows={3}
      />
      <AdminField
        label="Achievements (one per line)"
        name="achievements"
        defaultValue={entry.achievements.join("\n")}
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/education/entry-form.tsx
git commit -m "Add EducationEntryForm shared by create and edit routes"
```

---

### Task 5: Education pages (list, new, edit)

**Files:**
- Create: `src/app/admin/education/page.tsx`
- Create: `src/app/admin/education/new/page.tsx`
- Create: `src/app/admin/education/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmDeleteForm` (Task 1), `deleteEducationEntry`/`moveEducationEntry` (Task 3), `EducationEntryForm` (Task 4), `prisma` from `@/lib/prisma`.
- Produces: `/admin/education`, `/admin/education/new`, `/admin/education/[id]` routes — consumed by Task 10 (dashboard link).

- [ ] **Step 1: Create `src/app/admin/education/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteEducationEntry, moveEducationEntry } from "./actions";

export const metadata: Metadata = { title: "Education — Admin" };

export default async function AdminEducationPage() {
  const entries = await prisma.educationEntry.findMany({ orderBy: { order: "asc" } });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">Education</h1>
        <Button asChild size="sm">
          <Link href="/admin/education/new">Add entry</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
          >
            <div>
              <p className="font-medium text-foreground">
                {entry.degree} in {entry.field}
              </p>
              <p className="text-sm text-muted-foreground">
                {entry.institution} · {entry.startYear}–{entry.endYear}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveEducationEntry.bind(null, entry.id, "up")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Move up">
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < entries.length - 1 && (
                <form action={moveEducationEntry.bind(null, entry.id, "down")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Move down">
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/education/${entry.id}`} aria-label="Edit">
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteEducationEntry.bind(null, entry.id)}
                confirmMessage={`Delete this education entry (${entry.institution})?`}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/education/new/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EducationEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add Education Entry — Admin" };

export default function NewEducationEntryPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/education"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Education
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Add Education Entry
      </h1>

      <div className="mt-8">
        <EducationEntryForm mode="create" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/education/[id]/page.tsx`**

`Number(id)` guards against a non-numeric URL segment (e.g. `/admin/education/abc`) — `Number.isNaN` catches that before it ever reaches Prisma, which would otherwise reject a `NaN` as an invalid `Int`.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EducationEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit Education Entry — Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEducationEntryPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) notFound();

  const entry = await prisma.educationEntry.findUnique({ where: { id: numericId } });
  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/education"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Education
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Education Entry
      </h1>

      <div className="mt-8">
        <EducationEntryForm mode="edit" entry={entry} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/education/page.tsx src/app/admin/education/new src/app/admin/education/\[id\]
git commit -m "Add Education list, create, and edit pages"
```

---

### Task 6: Experience Zod schema

**Files:**
- Create: `src/lib/experience-schema.ts`

**Interfaces:**
- Produces: `experienceEntrySchema`, `type ExperienceEntryFormValues` — consumed by Task 7.

- [ ] **Step 1: Create `src/lib/experience-schema.ts`**

`description` is required on `ExperienceEntry` (no `?` in the model), unlike Education's — so no null-normalization here.

```ts
import { z } from "zod";

export const experienceEntrySchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(150),
  role: z.string().trim().min(1, "Role is required").max(150),
  startDate: z.string().trim().min(1, "Start date is required").max(20),
  endDate: z.string().trim().min(1, "End date is required").max(20),
  description: z.string().trim().min(1, "Description is required").max(2000),
  highlights: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
});

export type ExperienceEntryFormValues = z.infer<typeof experienceEntrySchema>;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/experience-schema.ts
git commit -m "Add Zod schema for the Experience admin form"
```

---

### Task 7: Experience server actions

**Files:**
- Create: `src/app/admin/experience/actions.ts`

**Interfaces:**
- Consumes: `experienceEntrySchema`/`ExperienceEntryFormValues` from Task 6, `prisma` from `@/lib/prisma`.
- Produces: `createExperienceEntry`, `updateExperienceEntry`, `deleteExperienceEntry`, `moveExperienceEntry`, `type ExperienceEntryFormState` — consumed by Task 8 and Task 9.

- [ ] **Step 1: Create `src/app/admin/experience/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { experienceEntrySchema } from "@/lib/experience-schema";

export type ExperienceEntryFormState = {
  errors?: Partial<Record<keyof typeof experienceEntrySchema.shape, string>>;
  success?: boolean;
  message?: string;
};

function fieldErrors(error: z.ZodError) {
  const errors: ExperienceEntryFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof experienceEntrySchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function createExperienceEntry(
  _prevState: ExperienceEntryFormState,
  formData: FormData
): Promise<ExperienceEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = experienceEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    const { _max } = await prisma.experienceEntry.aggregate({ _max: { order: true } });
    await prisma.experienceEntry.create({
      data: { ...parsed.data, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    console.error("Failed to create experience entry:", error);
    return { message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
  redirect("/admin/experience");
}

export async function updateExperienceEntry(
  id: number,
  _prevState: ExperienceEntryFormState,
  formData: FormData
): Promise<ExperienceEntryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = experienceEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    await prisma.experienceEntry.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Failed to update experience entry:", error);
    return { message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
  return { success: true };
}

export async function deleteExperienceEntry(id: number) {
  try {
    await prisma.experienceEntry.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete experience entry:", error);
    throw error;
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
}

export async function moveExperienceEntry(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.experienceEntry.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.experienceEntry.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.experienceEntry.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.experienceEntry.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder experience entry:", error);
    throw error;
  }

  revalidatePath("/admin/experience");
  revalidatePath("/");
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/experience/actions.ts
git commit -m "Add Experience server actions: create, update, delete, move"
```

---

### Task 8: Experience entry form

**Files:**
- Create: `src/app/admin/experience/entry-form.tsx`

**Interfaces:**
- Consumes: `AdminField` from `@/components/admin/admin-field`, `createExperienceEntry`/`updateExperienceEntry`/`ExperienceEntryFormState` from Task 7.
- Produces: `<ExperienceEntryForm mode="create" />` / `<ExperienceEntryForm mode="edit" entry={entry} />` — consumed by Task 9.

- [ ] **Step 1: Create `src/app/admin/experience/entry-form.tsx`**

```tsx
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
  }, [state.success, state.message]);

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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/experience/entry-form.tsx
git commit -m "Add ExperienceEntryForm shared by create and edit routes"
```

---

### Task 9: Experience pages (list, new, edit)

**Files:**
- Create: `src/app/admin/experience/page.tsx`
- Create: `src/app/admin/experience/new/page.tsx`
- Create: `src/app/admin/experience/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmDeleteForm` (Task 1), `deleteExperienceEntry`/`moveExperienceEntry` (Task 7), `ExperienceEntryForm` (Task 8), `prisma` from `@/lib/prisma`.
- Produces: `/admin/experience`, `/admin/experience/new`, `/admin/experience/[id]` routes — consumed by Task 10 (dashboard link).

- [ ] **Step 1: Create `src/app/admin/experience/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteExperienceEntry, moveExperienceEntry } from "./actions";

export const metadata: Metadata = { title: "Experience — Admin" };

export default async function AdminExperiencePage() {
  const entries = await prisma.experienceEntry.findMany({ orderBy: { order: "asc" } });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">Experience</h1>
        <Button asChild size="sm">
          <Link href="/admin/experience/new">Add entry</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
          >
            <div>
              <p className="font-medium text-foreground">
                {entry.role} at {entry.company}
              </p>
              <p className="text-sm text-muted-foreground">
                {entry.startDate} – {entry.endDate}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveExperienceEntry.bind(null, entry.id, "up")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Move up">
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < entries.length - 1 && (
                <form action={moveExperienceEntry.bind(null, entry.id, "down")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Move down">
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/experience/${entry.id}`} aria-label="Edit">
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteExperienceEntry.bind(null, entry.id)}
                confirmMessage={`Delete this experience entry (${entry.company})?`}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/experience/new/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExperienceEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add Experience Entry — Admin" };

export default function NewExperienceEntryPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/experience"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Experience
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Add Experience Entry
      </h1>

      <div className="mt-8">
        <ExperienceEntryForm mode="create" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/experience/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ExperienceEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit Experience Entry — Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditExperienceEntryPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) notFound();

  const entry = await prisma.experienceEntry.findUnique({ where: { id: numericId } });
  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/experience"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Experience
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Experience Entry
      </h1>

      <div className="mt-8">
        <ExperienceEntryForm mode="edit" entry={entry} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/experience/page.tsx src/app/admin/experience/new src/app/admin/experience/\[id\]
git commit -m "Add Experience list, create, and edit pages"
```

---

### Task 10: Link Education & Experience from the dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `/admin/education` (Task 5), `/admin/experience` (Task 9).

- [ ] **Step 1: Update the `sections` array in `src/app/admin/page.tsx`**

Change `href: null` to the real routes for the Education and Experience entries only — Skills, Projects, and Case Studies stay `null` exactly as Plan 2a left them, since those routes still don't exist.

```tsx
  {
    label: "Education",
    href: "/admin/education",
    description: "Academic timeline entries",
  },
  {
    label: "Experience",
    href: "/admin/experience",
    description: "Work timeline entries",
  },
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "Link Education and Experience from the admin dashboard"
```

---

### Task 11: Full verification pass

**Files:** none (verification only, unless a fix is needed).

- [ ] **Step 1: Typecheck, lint, build**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run lint` — expect 0 errors.
Run: `npm run build` — expect success; `/admin/education`, `/admin/education/new`, `/admin/education/[id]`, `/admin/experience`, `/admin/experience/new`, `/admin/experience/[id]` should all appear in the route table.

- [ ] **Step 2: Manual browser pass — Education**

With the dev server running and `ADMIN_PASSWORD` set:
- Visit `/admin`, confirm "Education" and "Experience" are now clickable links.
- Click into `/admin/education` — confirm existing entries render in their seeded order.
- Click "Add entry", submit with the Institution field blank — confirm an inline error appears and no entry was created.
- Fill in all fields (use an obviously-fake entry, e.g. institution "TEST DELETE ME"), including two lines in Achievements, submit — confirm it redirects to `/admin/education` and the new row appears last.
- Click ▲ on the new row a couple of times — confirm it moves up the list and the ▲/▼ buttons appear/disappear correctly at the top and bottom.
- Click the edit (pencil) icon on the test row, change a field, save — confirm a success toast and the change is reflected on returning to the list.
- Click delete, cancel the confirm dialog — confirm nothing happens. Click delete again, accept — confirm the row is gone from the list.
- Visit `/` (public homepage) — confirm the Education section reflects the current real entries with no leftover test data and no rebuild needed.

- [ ] **Step 3: Manual browser pass — Experience**

Repeat Step 2's flow at `/admin/experience` (add a test entry, reorder, edit, delete, confirm the public Experience section on `/` is unaffected by any leftover test data).

- [ ] **Step 4: Commit (only if a fix was needed)**

```bash
git add [exact files fixed]
git commit -m "Fix [specific issue] found in Education/Experience form verification"
```
