# Admin Forms — Case Studies (Plan 2e) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship full create/edit/delete/reorder admin CRUD for the `CaseStudy` list — the last remaining admin section. Structurally almost identical to Projects (Plan 2d): same list+detail pages, same image-upload-inside-the-save-action pattern, same P2002 slug handling. The one genuinely new piece is `screenshots` and `codeSnippets`, which are `Json` columns holding arrays of structured objects (`{url, caption}[]` and `{title, language, code}[]`), not separate database rows.

**Architecture:** Same Zod-schema → server-action → `AdminField`-based-form → `revalidatePath` pattern as every prior plan in this series. `screenshots`/`codeSnippets` are each a single `Textarea` where the admin edits/pastes the raw JSON array directly — confirmed as the user's explicit choice over building a structured add/remove-row UI, since case studies are added rarely (a handful of times a year) and the admin is a developer comfortable hand-writing JSON. The Zod schema does the JSON.parse + shape validation via a small shared `jsonArrayField()` helper (verified against the installed zod v4.4.3 with a live test before writing this plan — `.transform()` + `ctx.addIssue`/`z.NEVER` + `.pipe(z.array(...))` correctly handles all four cases: valid JSON, empty string → `[]`, invalid JSON → a clean field error, and valid-JSON-wrong-shape → a field error pointing at the specific bad property).

**Built in from the start** (every one of these was a fix a prior plan's final review had to retrofit — see the plan file headers for Skills and Projects if you want the history; this plan just does them correctly from commit one):
- `values` echoed on both the validation-error and Prisma-failure paths, never on success, built from only string `FormData` entries (excludes `imageFile`).
- Every toast `useEffect` depends on `[state]` (the whole object).
- `CaseStudy.slug` is `@unique` — `P2002` is caught in the database-write try/catch (not the upload try/catch) and mapped to a field-level `slug` error.
- Every newline-separated array field (`techStack`, `challenges`, `lessonsLearned`, `futureImprovements`) gets `.max(2000)` on the raw string before the split/trim/filter transform.
- `[id]` route uses `!Number.isInteger(numericId)`, not `Number.isNaN`.
- The file input carries `aria-invalid`/`aria-describedby` wired to `state.errors?.imageFile`, with a matching `id` on its error `<p>`, and a muted-text hint noting the upload size limit — all three were Projects' final-review fixes, built in here from the start.
- `updateCaseStudy` revalidates its OWN edit route (`/admin/case-studies/${id}`) in addition to the list and homepage — Projects' final review caught that skipping this leaves a stale image preview after replacing an image.
- `images.remotePatterns` for the Blob hostname is already configured globally in `next.config.ts` (done in Plan 2d) — nothing to do here, but it's why this plan doesn't need to touch `next.config.ts` at all.

## Global Constraints

- No new dependencies — `@vercel/blob` and Zod are already installed from Plan 2d.
- `screenshots` shape: `{ url: string (non-empty), caption: string }[]`. `codeSnippets` shape: `{ title: string (non-empty), language: string (non-empty), code: string }[]`. Both default to `[]` when the textarea is blank — an admin who never touches these fields gets a valid empty array, not a validation error.
- `screenshots.url` is a plain string the admin pastes in (e.g. a URL to an already-uploaded image) — there is no per-screenshot file-upload UI in this plan. Only the case study's own cover `imageUrl` goes through the file-upload flow, same as `Project.imageUrl`.
- `tagline`, `overview`, `architecture`, and `systemDesign` are required non-empty strings on the `CaseStudy` model (no `?` in the schema) — unlike Project's `tagline`, these do NOT get the empty-string-to-null transform; they get `.min(1, "...")` instead, matching how required fields are handled everywhere else in this series.
- `databaseDesign` and `security` ARE optional (`String?`) — these get the empty-string-to-null transform.
- `moveCaseStudy`'s neighbor lookup is a flat top-level list, same as `moveProject` — no grouping.
- No blob cleanup on delete/replace, and no cleanup of an orphaned blob if a successful upload is followed by a failed database write — same deferred-cleanup reasoning as Plan 2d's Global Constraints, not repeated in full here.
- No URL-format validation on `liveUrl`/`githubUrl` — matches every prior plan's convention.

---

### Task 1: `CaseStudy` Zod schema

**Files:**
- Create: `src/lib/case-study-schema.ts`

**Interfaces:**
- Produces: `caseStudySchema`, `type CaseStudyFormValues` — consumed by Task 2.

- [ ] **Step 1: Create `src/lib/case-study-schema.ts`**

`jsonArrayField` is a small local helper (used twice in this same file, for `screenshots` and `codeSnippets` — not exported or shared elsewhere, matching the "DRY within one file" convention already used for the `fieldErrors` helpers in every actions.ts in this series). It parses the raw textarea string as JSON and validates it against the given item shape; a blank string produces `[]`, invalid JSON produces a clean field-level error, and valid-JSON-wrong-shape produces a field-level error pointing at the specific bad property.

```ts
import { z } from "zod";

function jsonArrayField<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .string()
    .max(10000)
    .transform((value, ctx) => {
      if (value.trim() === "") return [];
      try {
        return JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.NEVER;
      }
    })
    .pipe(z.array(itemSchema));
}

export const caseStudySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1, "Name is required").max(100),
  tagline: z.string().trim().min(1, "Tagline is required").max(300),
  techStack: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  liveUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
  githubUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
  overview: z.string().trim().min(1, "Overview is required").max(5000),
  architecture: z.string().trim().min(1, "Architecture is required").max(5000),
  systemDesign: z.string().trim().min(1, "System design is required").max(5000),
  databaseDesign: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => (value === "" ? null : value)),
  security: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => (value === "" ? null : value)),
  challenges: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  lessonsLearned: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  futureImprovements: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  screenshots: jsonArrayField(
    z.object({
      url: z.string().trim().min(1, "Screenshot url is required"),
      caption: z.string().trim(),
    })
  ),
  codeSnippets: jsonArrayField(
    z.object({
      title: z.string().trim().min(1, "Snippet title is required"),
      language: z.string().trim().min(1, "Snippet language is required"),
      code: z.string(),
    })
  ),
});

export type CaseStudyFormValues = z.infer<typeof caseStudySchema>;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/case-study-schema.ts
git commit -m "Add Zod schema for the Case Studies admin form"
```

---

### Task 2: CaseStudy server actions

**Files:**
- Create: `src/app/admin/case-studies/actions.ts`

**Interfaces:**
- Consumes: `caseStudySchema`/`CaseStudyFormValues` from Task 1, `prisma` from `@/lib/prisma`, `put` from `@vercel/blob`, `Prisma` from `@prisma/client`.
- Produces: `createCaseStudy`, `updateCaseStudy`, `deleteCaseStudy`, `moveCaseStudy`, `type CaseStudyFormState` — consumed by Tasks 3-4.

- [ ] **Step 1: Create `src/app/admin/case-studies/actions.ts`**

Structurally this is Plan 2d's `src/app/admin/projects/actions.ts` with the field set swapped and `updateCaseStudy` also revalidating its own edit route (a fix Projects' final review had to add after the fact — built in here from the start).

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { caseStudySchema } from "@/lib/case-study-schema";

export type CaseStudyFormState = {
  errors?: Partial<Record<keyof typeof caseStudySchema.shape | "imageFile", string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function fieldErrors(error: z.ZodError) {
  const errors: CaseStudyFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof caseStudySchema.shape;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function textValues(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  return raw;
}

export async function createCaseStudy(
  _prevState: CaseStudyFormState,
  formData: FormData
): Promise<CaseStudyFormState> {
  const raw = textValues(formData);
  const parsed = caseStudySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { errors: { imageFile: "An image is required" }, values: raw };
  }

  let imageUrl: string;
  try {
    const blob = await put(`case-studies/${parsed.data.slug}-${Date.now()}`, imageFile, {
      access: "public",
    });
    imageUrl = blob.url;
  } catch (error) {
    console.error("Failed to upload case study image:", error);
    return { message: "Could not upload image. Please try again.", values: raw };
  }

  try {
    const { _max } = await prisma.caseStudy.aggregate({ _max: { order: true } });
    await prisma.caseStudy.create({
      data: { ...parsed.data, imageUrl, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A case study with this slug already exists." }, values: raw };
    }
    console.error("Failed to create case study:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  redirect("/admin/case-studies");
}

export async function updateCaseStudy(
  id: number,
  _prevState: CaseStudyFormState,
  formData: FormData
): Promise<CaseStudyFormState> {
  const raw = textValues(formData);
  const parsed = caseStudySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  let imageUrl: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const blob = await put(`case-studies/${parsed.data.slug}-${Date.now()}`, imageFile, {
        access: "public",
      });
      imageUrl = blob.url;
    } catch (error) {
      console.error("Failed to upload case study image:", error);
      return { message: "Could not upload image. Please try again.", values: raw };
    }
  }

  try {
    await prisma.caseStudy.update({
      where: { id },
      data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A case study with this slug already exists." }, values: raw };
    }
    console.error("Failed to update case study:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/case-studies");
  revalidatePath(`/admin/case-studies/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteCaseStudy(id: number) {
  try {
    await prisma.caseStudy.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete case study:", error);
    throw error;
  }

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
}

export async function moveCaseStudy(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.caseStudy.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.caseStudy.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.caseStudy.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.caseStudy.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder case study:", error);
    throw error;
  }

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/case-studies/actions.ts
git commit -m "Add CaseStudy server actions: create, update, delete, move"
```

---

### Task 3: `CaseStudyEntryForm` component

**Files:**
- Create: `src/app/admin/case-studies/entry-form.tsx`

**Interfaces:**
- Consumes: `createCaseStudy`, `updateCaseStudy`, `CaseStudyFormState` from Task 2; `AdminField` from `@/components/admin/admin-field`.
- Produces: `<CaseStudyEntryForm mode="create" />` / `<CaseStudyEntryForm mode="edit" entry={caseStudy} />` — consumed by Task 4.

- [ ] **Step 1: Create `src/app/admin/case-studies/entry-form.tsx`**

`screenshots`/`codeSnippets` render as a single large `Textarea` each, pre-filled with the current value pretty-printed via `JSON.stringify(entry.screenshots, null, 2)` — `CaseStudy.screenshots`/`codeSnippets` are Prisma `Json` columns, typed as `Prisma.JsonValue`, which `JSON.stringify` handles directly. A hint paragraph under each shows the exact expected shape, since this is the one field type in this whole admin series the shape isn't obvious from the label alone.

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import type { CaseStudy } from "@prisma/client";
import { createCaseStudy, updateCaseStudy, type CaseStudyFormState } from "./actions";

const initialState: CaseStudyFormState = {};

const emptyEntry = {
  slug: "",
  name: "",
  tagline: "",
  imageUrl: "",
  techStack: [] as string[],
  liveUrl: null as string | null,
  githubUrl: null as string | null,
  overview: "",
  architecture: "",
  systemDesign: "",
  databaseDesign: null as string | null,
  security: null as string | null,
  challenges: [] as string[],
  lessonsLearned: [] as string[],
  futureImprovements: [] as string[],
  screenshots: [] as unknown[],
  codeSnippets: [] as unknown[],
};

type Props = { mode: "create" } | { mode: "edit"; entry: CaseStudy };

export function CaseStudyEntryForm(props: Props) {
  const entry = props.mode === "edit" ? props.entry : emptyEntry;
  const action =
    props.mode === "edit" ? updateCaseStudy.bind(null, props.entry.id) : createCaseStudy;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Case study updated.");
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-5">
      <AdminField
        label="Slug"
        name="slug"
        defaultValue={state.values?.slug ?? entry.slug}
        error={state.errors?.slug}
      />
      <AdminField
        label="Name"
        name="name"
        defaultValue={state.values?.name ?? entry.name}
        error={state.errors?.name}
      />
      <AdminField
        label="Tagline"
        name="tagline"
        defaultValue={state.values?.tagline ?? entry.tagline}
        error={state.errors?.tagline}
      />

      <div>
        <label htmlFor="imageFile" className="mb-1.5 block text-sm font-medium text-foreground">
          Image {props.mode === "create" && <span className="text-destructive">*</span>}
        </label>
        {entry.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.imageUrl}
            alt="Current"
            className="mb-2 h-32 w-auto rounded-lg border border-border object-cover"
          />
        )}
        <input
          id="imageFile"
          name="imageFile"
          type="file"
          accept="image/*"
          required={props.mode === "create"}
          aria-invalid={!!state.errors?.imageFile}
          aria-describedby={state.errors?.imageFile ? "imageFile-error" : undefined}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
        />
        {props.mode === "edit" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to keep the current image.
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Images larger than 8MB will fail to upload.
        </p>
        {state.errors?.imageFile && (
          <p id="imageFile-error" className="mt-1.5 text-xs text-destructive">
            {state.errors.imageFile}
          </p>
        )}
      </div>

      <AdminField
        label="Tech Stack (one per line)"
        name="techStack"
        defaultValue={state.values?.techStack ?? entry.techStack.join("\n")}
        error={state.errors?.techStack}
        textarea
        rows={3}
      />
      <AdminField
        label="Live URL"
        name="liveUrl"
        defaultValue={state.values?.liveUrl ?? (entry.liveUrl ?? "")}
        error={state.errors?.liveUrl}
      />
      <AdminField
        label="GitHub URL"
        name="githubUrl"
        defaultValue={state.values?.githubUrl ?? (entry.githubUrl ?? "")}
        error={state.errors?.githubUrl}
      />
      <AdminField
        label="Overview"
        name="overview"
        defaultValue={state.values?.overview ?? entry.overview}
        error={state.errors?.overview}
        textarea
        rows={5}
      />
      <AdminField
        label="Architecture"
        name="architecture"
        defaultValue={state.values?.architecture ?? entry.architecture}
        error={state.errors?.architecture}
        textarea
        rows={5}
      />
      <AdminField
        label="System Design"
        name="systemDesign"
        defaultValue={state.values?.systemDesign ?? entry.systemDesign}
        error={state.errors?.systemDesign}
        textarea
        rows={5}
      />
      <AdminField
        label="Database Design (optional)"
        name="databaseDesign"
        defaultValue={state.values?.databaseDesign ?? (entry.databaseDesign ?? "")}
        error={state.errors?.databaseDesign}
        textarea
        rows={4}
      />
      <AdminField
        label="Security (optional)"
        name="security"
        defaultValue={state.values?.security ?? (entry.security ?? "")}
        error={state.errors?.security}
        textarea
        rows={4}
      />
      <AdminField
        label="Challenges (one per line)"
        name="challenges"
        defaultValue={state.values?.challenges ?? entry.challenges.join("\n")}
        error={state.errors?.challenges}
        textarea
        rows={3}
      />
      <AdminField
        label="Lessons Learned (one per line)"
        name="lessonsLearned"
        defaultValue={state.values?.lessonsLearned ?? entry.lessonsLearned.join("\n")}
        error={state.errors?.lessonsLearned}
        textarea
        rows={3}
      />
      <AdminField
        label="Future Improvements (one per line)"
        name="futureImprovements"
        defaultValue={state.values?.futureImprovements ?? entry.futureImprovements.join("\n")}
        error={state.errors?.futureImprovements}
        textarea
        rows={3}
      />

      <div>
        <AdminField
          label="Screenshots (JSON)"
          name="screenshots"
          defaultValue={state.values?.screenshots ?? JSON.stringify(entry.screenshots, null, 2)}
          error={state.errors?.screenshots}
          textarea
          rows={6}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Format: {`[{"url": "https://...", "caption": "..."}]`} — leave as{" "}
          <code>[]</code> for none.
        </p>
      </div>

      <div>
        <AdminField
          label="Code Snippets (JSON)"
          name="codeSnippets"
          defaultValue={state.values?.codeSnippets ?? JSON.stringify(entry.codeSnippets, null, 2)}
          error={state.errors?.codeSnippets}
          textarea
          rows={8}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Format: {`[{"title": "...", "language": "typescript", "code": "..."}]`} — leave as{" "}
          <code>[]</code> for none.
        </p>
      </div>

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
git add src/app/admin/case-studies/entry-form.tsx
git commit -m "Add CaseStudyEntryForm shared by create and edit routes"
```

---

### Task 4: Case Studies pages (list, new, edit)

**Files:**
- Create: `src/app/admin/case-studies/page.tsx`
- Create: `src/app/admin/case-studies/new/page.tsx`
- Create: `src/app/admin/case-studies/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmDeleteForm` from `@/components/admin/confirm-delete-form`, `deleteCaseStudy`/`moveCaseStudy` from Task 2, `CaseStudyEntryForm` from Task 3, `prisma` from `@/lib/prisma`.
- Produces: `/admin/case-studies`, `/admin/case-studies/new`, `/admin/case-studies/[id]` routes — consumed by Task 5.

- [ ] **Step 1: Create `src/app/admin/case-studies/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteCaseStudy, moveCaseStudy } from "./actions";

export const metadata: Metadata = { title: "Case Studies — Admin" };

export default async function AdminCaseStudiesPage() {
  const caseStudies = await prisma.caseStudy.findMany({ orderBy: { order: "asc" } });

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
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">
          Case Studies
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/case-studies/new">Add case study</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {caseStudies.map((caseStudy, index) => (
          <li
            key={caseStudy.id}
            className="flex items-center gap-4 rounded-xl border border-border p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={caseStudy.imageUrl}
              alt={caseStudy.name}
              className="size-14 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{caseStudy.name}</p>
              <p className="text-sm text-muted-foreground">{caseStudy.slug}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveCaseStudy.bind(null, caseStudy.id, "up")}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${caseStudy.name} up`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < caseStudies.length - 1 && (
                <form action={moveCaseStudy.bind(null, caseStudy.id, "down")}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${caseStudy.name} down`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/case-studies/${caseStudy.id}`} aria-label={`Edit ${caseStudy.name}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteCaseStudy.bind(null, caseStudy.id)}
                confirmMessage={`Delete the case study "${caseStudy.name}"? This cannot be undone.`}
                entryLabel={caseStudy.name}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/case-studies/new/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CaseStudyEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add Case Study — Admin" };

export default function NewCaseStudyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/case-studies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Case Studies
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Add Case Study
      </h1>

      <div className="mt-8">
        <CaseStudyEntryForm mode="create" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/case-studies/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CaseStudyEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit Case Study — Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCaseStudyPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const caseStudy = await prisma.caseStudy.findUnique({ where: { id: numericId } });
  if (!caseStudy) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/case-studies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Case Studies
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Case Study
      </h1>

      <div className="mt-8">
        <CaseStudyEntryForm mode="edit" entry={caseStudy} />
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
git add src/app/admin/case-studies/page.tsx src/app/admin/case-studies/new src/app/admin/case-studies/\[id\]
git commit -m "Add Case Studies list, create, and edit pages"
```

---

### Task 5: Link Case Studies from the dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `/admin/case-studies` from Task 4.

- [ ] **Step 1: Update the `sections` array in `src/app/admin/page.tsx`**

Change the Case Studies entry's `href` from `null` to `"/admin/case-studies"` — this is the last `null` in the array; every section now has a real route.

```tsx
  {
    label: "Case Studies",
    href: "/admin/case-studies",
    description: "The long-form write-ups",
  },
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "Link Case Studies from the admin dashboard"
```

---

### Task 6: Full verification pass

**Files:** none (verification only, unless a fix is needed).

- [ ] **Step 1: Typecheck, lint, build**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run lint` — expect 0 errors.
Run: `npm run build` — expect success; `/admin/case-studies`, `/admin/case-studies/new`, `/admin/case-studies/[id]` should all appear in the route table as dynamic (`ƒ`).

- [ ] **Step 2: Confirm the Blob env setup before testing uploads**

Run: `grep -c '^BLOB_STORE_ID=' .env.local` — expect `0`.
Run: `grep -c '^BLOB_READ_WRITE_TOKEN=' .env.local .env` — expect at least one match.

- [ ] **Step 3: Verify the create/update/upload path directly against the real Blob store and database**

Browser automation cannot programmatically set a native `<input type="file">`'s value (confirmed in Plan 2d — it throws `InvalidStateError`). Verify the actual upload logic the same way Plan 2d did: import `createCaseStudy`/`updateCaseStudy` directly (e.g. via `npx tsx --env-file=.env --env-file=.env.local`) and call them with a real `File` read from disk and a real `FormData`. Specifically confirm:
- A duplicate slug (use an existing seeded case study's slug) with a real image and valid JSON for `screenshots`/`codeSnippets` correctly uploads the image, then fails the DB write with a field-level `slug` error and a full `values` echo (including the raw JSON strings, unparsed).
- Invalid JSON in `screenshots` (e.g. `"{not json"`) produces a field-level error on `screenshots` and does NOT attempt an image upload at all (validation runs before upload).
- A unique slug with a real image and valid JSON for both JSON fields succeeds — inspect the created row directly via Prisma and confirm `screenshots`/`codeSnippets` are stored as real parsed arrays (not strings), and `imageUrl` is a real Blob URL.
- `updateCaseStudy` called with no new file keeps the existing `imageUrl` unchanged.
- **Before deleting the test row**, start the dev server and load `/` and `/case-studies/<test-slug>` — confirm the uploaded image actually renders via `next/image` (check for a `200` on the `/_next/image?...` request). This exact check is what a prior plan's (Projects) final review had to catch after its own verification pass deleted test data too early — don't repeat that mistake here.
- Clean up the test row and its blob (via `del()` from `@vercel/blob`) only after that check passes.

- [ ] **Step 4: Manual browser pass for everything else**

With the dev server running and `ADMIN_PASSWORD` set:
- Visit `/admin`, confirm "Case Studies" is now a clickable link — every dashboard section should now have a real route.
- Click into `/admin/case-studies` — confirm existing seeded case studies render with thumbnails.
- Move a case study up/down — confirm reordering works.
- Delete a test case study (cancel then confirm) — confirm cancel does nothing and confirm removes it (use a case study created via Step 3's direct-script method if one is still around, or create one fresh through this manual pass and delete it here).
- Visit `/` (public homepage) — confirm the Case Studies section reflects the current real case studies with no leftover test data.

- [ ] **Step 5: Commit (only if a fix was needed)**

```bash
git add [exact files fixed]
git commit -m "Fix [specific issue] found in Case Studies admin verification"
```
