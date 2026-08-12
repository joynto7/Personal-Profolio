# Admin Forms — Projects (Plan 2d) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship full create/edit/delete/reorder admin CRUD for the `Project` list, including image upload to Vercel Blob — the first admin form in this series that handles a file, not just text fields.

**Architecture:** Same Zod-schema → server-action → `AdminField`-based-form → `revalidatePath` pattern as Education/Experience (Plan 2b): list + `/new` + `/[id]` pages, ▲▼ reorder swapping `order` in a transaction, delete via the shared `ConfirmDeleteForm`. The one new piece is the image: each create/edit form carries a plain `<input type="file">` alongside the `AdminField`s, and the image upload happens *inside* the same server action that saves the rest of the form — one Save button, one submission, no separate "upload first" step. On create, a file is required (there's no existing image to fall back to). On edit, the file is optional — if none is chosen, the existing `imageUrl` is kept.

**Verified before writing this plan** (do not re-derive, trust these):
- `@vercel/blob` v2.8.0's server-side `put(pathname, body, options)` returns `{url, downloadUrl, pathname, contentType, contentDisposition, etag}` — confirmed with a live smoke test against the real store.
- **Local dev requires `BLOB_STORE_ID` to be UNSET in `.env.local`.** This project's Blob store has OIDC enabled, and the SDK prefers OIDC over the plain `BLOB_READ_WRITE_TOKEN` whenever `BLOB_STORE_ID` (or `process.env.BLOB_STORE_ID`) is present — but Vercel disallows OIDC for the "development" target, so `put()` throws `BlobOidcEnvironmentNotAllowedError` locally if `BLOB_STORE_ID` is set. `.env.local` in this repo has already been corrected to have only `BLOB_READ_WRITE_TOKEN`, not `BLOB_STORE_ID`. **Do not add `BLOB_STORE_ID` back to `.env.local`.** (Production/Preview deploys use OIDC automatically via Vercel's own `BLOB_STORE_ID`/`VERCEL_OIDC_TOKEN` env vars, which is a separate, already-correct concern — nothing to do there.)
- Next.js 16's server-action body size limit lives at `experimental.serverActions.bodySizeLimit` in `next.config.ts` (confirmed against the installed `next` package's own type definitions) and accepts a string like `"8mb"`.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), Zod, `@vercel/blob` (new dependency), existing `Input`/`Button`/`AdminField`/`ConfirmDeleteForm` components, `sonner`, Prisma (`$transaction` for reorder swaps, `Prisma.PrismaClientKnownRequestError` for unique-constraint handling).

## Global Constraints

- `Project.slug` is `@unique` in the schema — create/update actions must catch Prisma's `P2002` and return a field-level `slug` error, not the generic message. (Built in from the start this time — a prior plan's final review had to retrofit this exact handling for `SkillGroup.category`.)
- Every create/update action returns `values` on both the validation-error and Prisma-failure paths, never on success — `values` is built from only the **string** `FormData` entries (the `imageFile` field is a `File`, not a string, and can never be usefully echoed back into a file input anyway — browsers refuse to pre-fill `<input type="file">` for security reasons, so there is nothing to restore there regardless).
- Every toast-firing `useEffect` depends on `[state]` (the whole object), never individual fields.
- `moveProject`'s neighbor lookup is a flat top-level list — no `groupId`-style scoping (there's nothing to scope by; every project is a peer of every other).
- `[id]` route guards against a non-integer segment with `Number.isInteger`, calling `notFound()` — same pattern as Education/Experience.
- No blob cleanup (deleting the old image file from Blob storage when a project's image is replaced or the project itself is deleted) in this plan — explicitly deferred. Orphaned blob files accumulate but this is a personal portfolio with a handful of projects; not worth the extra code this pass. A third source of orphaned blobs: if `createProject` uploads an image successfully but the subsequent database write fails (e.g. a duplicate slug caught by `P2002`), that uploaded blob is orphaned too — same deferred-cleanup reasoning applies.
- No URL-format validation on `liveUrl`/`githubUrl` — matches the existing convention in `profile-schema.ts` (`avatarUrl`/`resumeUrl` are also just length-capped strings, no format check).
- Every newline-separated array field (`techStack`, `challenges`, `futureImprovements`) gets a `.max(2000)` character cap on the raw string before the split/trim/filter transform — built in from the start (a prior plan's final review had to retrofit this for `achievements`/`highlights`).

---

### Task 1: Install `@vercel/blob`, raise the server-action body limit, add the Project Zod schema

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `next.config.ts`
- Create: `src/lib/project-schema.ts`

**Interfaces:**
- Produces: `projectSchema`, `type ProjectFormValues` — consumed by Task 2. Also produces the raised body-size limit, which Task 2's file upload depends on.

- [ ] **Step 1: Install `@vercel/blob`**

```bash
npm install @vercel/blob
```

- [ ] **Step 2: Raise the server-action body size limit in `next.config.ts`**

Full replacement of the file's contents:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create `src/lib/project-schema.ts`**

`slug` is constrained to lowercase letters, digits, and hyphens, since it's used directly in the public `/projects/[slug]` route. Every optional field normalizes an empty string to `null` to match the corresponding column's nullability in `prisma/schema.prisma`.

```ts
import { z } from "zod";

export const projectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1, "Name is required").max(100),
  tagline: z
    .string()
    .trim()
    .max(300)
    .transform((value) => (value === "" ? null : value)),
  techStack: z
    .string()
    .max(2000)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value)),
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
  challenges: z
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
  caseStudySlug: z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value === "" ? null : value)),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts src/lib/project-schema.ts
git commit -m "Add @vercel/blob, raise server-action body limit, add Project Zod schema"
```

---

### Task 2: Project server actions

**Files:**
- Create: `src/app/admin/projects/actions.ts`

**Interfaces:**
- Consumes: `projectSchema`/`ProjectFormValues` from Task 1, `prisma` from `@/lib/prisma`, `put` from `@vercel/blob`, `Prisma` from `@prisma/client`.
- Produces: `createProject`, `updateProject`, `deleteProject`, `moveProject`, `type ProjectFormState` — consumed by Tasks 3-4.

- [ ] **Step 1: Create `src/app/admin/projects/actions.ts`**

`textValues` picks out only the string entries of `FormData`, deliberately excluding `imageFile` (a `File`) — this is what both the Zod validation input and the `values` echo are built from. The image upload itself happens after Zod validation succeeds, so a validation error never triggers a wasted upload.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/project-schema";

export type ProjectFormState = {
  errors?: Partial<Record<keyof typeof projectSchema.shape | "imageFile", string>>;
  success?: boolean;
  message?: string;
  values?: Record<string, string>;
};

function fieldErrors(error: z.ZodError) {
  const errors: ProjectFormState["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof typeof projectSchema.shape;
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

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const raw = textValues(formData);
  const parsed = projectSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { errors: { imageFile: "An image is required" }, values: raw };
  }

  let imageUrl: string;
  try {
    const blob = await put(`projects/${parsed.data.slug}-${Date.now()}`, imageFile, {
      access: "public",
    });
    imageUrl = blob.url;
  } catch (error) {
    console.error("Failed to upload project image:", error);
    return { message: "Could not upload image. Please try again.", values: raw };
  }

  try {
    const { _max } = await prisma.project.aggregate({ _max: { order: true } });
    await prisma.project.create({
      data: { ...parsed.data, imageUrl, order: (_max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A project with this slug already exists." }, values: raw };
    }
    console.error("Failed to create project:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function updateProject(
  id: number,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const raw = textValues(formData);
  const parsed = projectSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }

  const imageFile = formData.get("imageFile");
  let imageUrl: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const blob = await put(`projects/${parsed.data.slug}-${Date.now()}`, imageFile, {
        access: "public",
      });
      imageUrl = blob.url;
    } catch (error) {
      console.error("Failed to upload project image:", error);
      return { message: "Could not upload image. Please try again.", values: raw };
    }
  }

  try {
    await prisma.project.update({
      where: { id },
      data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "A project with this slug already exists." }, values: raw };
    }
    console.error("Failed to update project:", error);
    return { message: "Could not save. Please try again.", values: raw };
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProject(id: number) {
  try {
    await prisma.project.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw error;
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export async function moveProject(id: number, direction: "up" | "down") {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.project.findUniqueOrThrow({ where: { id } });
      const neighbor = await tx.project.findFirst({
        where:
          direction === "up"
            ? { order: { lt: current.order } }
            : { order: { gt: current.order } },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });
      if (!neighbor) return;

      await tx.project.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.project.update({ where: { id: neighbor.id }, data: { order: current.order } });
    });
  } catch (error) {
    console.error("Failed to reorder project:", error);
    throw error;
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/projects/actions.ts
git commit -m "Add Project server actions: create, update, delete, move"
```

---

### Task 3: `ProjectEntryForm` component

**Files:**
- Create: `src/app/admin/projects/entry-form.tsx`

**Interfaces:**
- Consumes: `createProject`, `updateProject`, `ProjectFormState` from Task 2; `AdminField` from `@/components/admin/admin-field`.
- Produces: `<ProjectEntryForm mode="create" />` / `<ProjectEntryForm mode="edit" entry={project} />` — consumed by Task 4.

- [ ] **Step 1: Create `src/app/admin/projects/entry-form.tsx`**

The file input is `required` only in create mode (there's no existing image to fall back to in create mode; in edit mode leaving it blank keeps the current image). A validation failure clears whatever file was selected — this is an unavoidable browser limitation (file inputs can never be pre-filled from JS for security reasons) — so the field carries a hint telling the admin to re-select the image if that happens.

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import type { Project } from "@prisma/client";
import { createProject, updateProject, type ProjectFormState } from "./actions";

const initialState: ProjectFormState = {};

const emptyEntry = {
  slug: "",
  name: "",
  tagline: null as string | null,
  imageUrl: "",
  techStack: [] as string[],
  description: null as string | null,
  liveUrl: null as string | null,
  githubUrl: null as string | null,
  challenges: [] as string[],
  futureImprovements: [] as string[],
  caseStudySlug: null as string | null,
};

type Props = { mode: "create" } | { mode: "edit"; entry: Project };

export function ProjectEntryForm(props: Props) {
  const entry = props.mode === "edit" ? props.entry : emptyEntry;
  const action =
    props.mode === "edit" ? updateProject.bind(null, props.entry.id) : createProject;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Project updated.");
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
        defaultValue={state.values?.tagline ?? (entry.tagline ?? "")}
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
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
        />
        {props.mode === "edit" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to keep the current image.
          </p>
        )}
        {state.errors?.imageFile && (
          <p className="mt-1.5 text-xs text-destructive">{state.errors.imageFile}</p>
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
        label="Description"
        name="description"
        defaultValue={state.values?.description ?? (entry.description ?? "")}
        error={state.errors?.description}
        textarea
        rows={4}
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
        label="Challenges (one per line)"
        name="challenges"
        defaultValue={state.values?.challenges ?? entry.challenges.join("\n")}
        error={state.errors?.challenges}
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
      <AdminField
        label="Case Study Slug (optional)"
        name="caseStudySlug"
        defaultValue={state.values?.caseStudySlug ?? (entry.caseStudySlug ?? "")}
        error={state.errors?.caseStudySlug}
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
git add src/app/admin/projects/entry-form.tsx
git commit -m "Add ProjectEntryForm shared by create and edit routes"
```

---

### Task 4: Projects pages (list, new, edit)

**Files:**
- Create: `src/app/admin/projects/page.tsx`
- Create: `src/app/admin/projects/new/page.tsx`
- Create: `src/app/admin/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmDeleteForm` from `@/components/admin/confirm-delete-form`, `deleteProject`/`moveProject` from Task 2, `ProjectEntryForm` from Task 3, `prisma` from `@/lib/prisma`.
- Produces: `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]` routes — consumed by Task 5.

- [ ] **Step 1: Create `src/app/admin/projects/page.tsx`**

Each row shows a small thumbnail of the project's current image — unlike the earlier text-only list pages, Projects are inherently visual and a bare slug/name list would hide the one thing an admin most wants to glance at.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteForm } from "@/components/admin/confirm-delete-form";
import { prisma } from "@/lib/prisma";
import { deleteProject, moveProject } from "./actions";

export const metadata: Metadata = { title: "Projects — Admin" };

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { order: "asc" } });

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
        <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">Projects</h1>
        <Button asChild size="sm">
          <Link href="/admin/projects/new">Add project</Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {projects.map((project, index) => (
          <li
            key={project.id}
            className="flex items-center gap-4 rounded-xl border border-border p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.imageUrl}
              alt={project.name}
              className="size-14 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{project.name}</p>
              <p className="text-sm text-muted-foreground">{project.slug}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <form action={moveProject.bind(null, project.id, "up")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${project.name} up`}>
                    <ArrowUp className="size-4" />
                  </Button>
                </form>
              )}
              {index < projects.length - 1 && (
                <form action={moveProject.bind(null, project.id, "down")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Move ${project.name} down`}>
                    <ArrowDown className="size-4" />
                  </Button>
                </form>
              )}
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/projects/${project.id}`} aria-label={`Edit ${project.name}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deleteProject.bind(null, project.id)}
                confirmMessage={`Delete the project "${project.name}"? This cannot be undone.`}
                entryLabel={project.name}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/projects/new/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add Project — Admin" };

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Add Project
      </h1>

      <div className="mt-8">
        <ProjectEntryForm mode="create" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/projects/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectEntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit Project — Admin" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const project = await prisma.project.findUnique({ where: { id: numericId } });
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Project
      </h1>

      <div className="mt-8">
        <ProjectEntryForm mode="edit" entry={project} />
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
git add src/app/admin/projects/page.tsx src/app/admin/projects/new src/app/admin/projects/\[id\]
git commit -m "Add Projects list, create, and edit pages"
```

---

### Task 5: Link Projects from the dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `/admin/projects` from Task 4.

- [ ] **Step 1: Update the `sections` array in `src/app/admin/page.tsx`**

Change the Projects entry's `href` from `null` to `"/admin/projects"` — Case Studies stays `null`, since that route still doesn't exist.

```tsx
  {
    label: "Projects",
    href: "/admin/projects",
    description: "The project grid, including screenshots",
  },
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "Link Projects from the admin dashboard"
```

---

### Task 6: Full verification pass

**Files:** none (verification only, unless a fix is needed).

- [ ] **Step 1: Typecheck, lint, build**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run lint` — expect 0 errors.
Run: `npm run build` — expect success; `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]` should all appear in the route table as dynamic (`ƒ`).

- [ ] **Step 2: Confirm the Blob env setup before testing uploads**

Run: `grep -c '^BLOB_STORE_ID=' .env.local` — expect `0`. If it's not `0`, remove that line before testing (see this plan's header note on why).
Run: `grep -c '^BLOB_READ_WRITE_TOKEN=' .env.local .env` — expect at least one match.

- [ ] **Step 3: Manual browser pass**

With the dev server running and `ADMIN_PASSWORD` set:
- Visit `/admin`, confirm "Projects" is now a clickable link.
- Click into `/admin/projects` — confirm existing seeded projects render with thumbnails.
- Click "Add project", submit with no image selected — confirm the browser's native "required" validation blocks submission (no round-trip needed for this one, it's a native HTML validation).
- Fill in a slug that already exists (e.g. one of the seeded projects' slugs) with a real image selected — confirm a "already exists" error appears under Slug, and confirm the other fields you filled are NOT wiped (the `values` echo).
- Fix the slug to something unique (e.g. `test-delete-me`), submit with a real image file — confirm it redirects to `/admin/projects` and the new project appears with its uploaded image visibly rendering as the thumbnail.
- Click into the new test project's edit page, confirm all fields are pre-filled correctly and the current image renders above the file input.
- Change the name without selecting a new image, save — confirm the image stays the same after the edit.
- Select a new image and save — confirm the thumbnail updates to the new image.
- Move the test project up/down — confirm reordering works.
- Delete the test project (cancel then confirm) — confirm cancel does nothing and confirm removes it.
- Visit `/` (public homepage) — confirm the Projects section reflects the current real projects with no leftover test data, and confirm the images all still load correctly (no broken images from the Blob store).

- [ ] **Step 4: Commit (only if a fix was needed)**

```bash
git add [exact files fixed]
git commit -m "Fix [specific issue] found in Projects admin verification"
```
