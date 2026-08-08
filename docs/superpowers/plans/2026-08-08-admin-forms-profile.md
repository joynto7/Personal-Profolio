# Admin Forms — Shared Infrastructure + Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared server-action/form pattern the rest of the admin dashboard will reuse, and use it to ship the first real editing form — Profile — end to end.

**Architecture:** A Zod schema per content type (matching the existing `contact-schema.ts` convention), a plain Next.js server action per admin route (`"use server"`, no separate REST layer), a shared `<AdminField>` client component for labeled inputs with inline error text, and React 19's `useActionState` wiring the form to the action. Since every public page already reads the database on every request (Plan 1), a save just needs `revalidatePath` on the admin route itself — the public pages need no cache invalidation at all.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), Zod (already a dependency), existing `Input`/`Textarea`/`Button` UI components, `sonner` for toasts.

## Global Constraints

- No new dependencies — Zod, the UI components, and `sonner` are all already installed.
- No image upload in this plan — `avatarUrl` is a plain text/URL input. File upload is a separate, later plan (Plan 3).
- **Prerequisite:** `ADMIN_PASSWORD` must be set in `.env.local` before Task 5's manual verification can exercise the actual login → edit → save flow. If it's still unset when Task 5 runs, do everything else in Task 5 and report the login-dependent check as an explicit open item — do not skip the rest of verification and do not pick a password.
- Every admin form in this and future plans should follow the exact pattern this plan establishes (Zod schema → server action → `<AdminField>`-based form → `revalidatePath`) — later plans should not invent a different pattern.

---

### Task 1: Profile Zod schema

**Files:**
- Create: `src/lib/profile-schema.ts`

**Interfaces:**
- Produces: `profileSchema`, `type ProfileFormValues` — consumed by Task 3.

- [ ] **Step 1: Create `src/lib/profile-schema.ts`**

All 12 fields on the `Profile` model are required, non-empty strings (confirmed against `prisma/schema.prisma` — no `?` on any field), so this schema has no optional fields.

```ts
import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  designation: z.string().trim().min(1, "Designation is required").max(100),
  tagline: z.string().trim().min(1, "Tagline is required").max(300),
  location: z.string().trim().min(1, "Location is required").max(100),
  avatarUrl: z.string().trim().min(1, "Avatar URL is required").max(500),
  resumeUrl: z.string().trim().min(1, "Resume URL is required").max(500),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  whatsapp: z.string().trim().min(1, "WhatsApp is required").max(30),
  bioJourney: z.string().trim().min(1, "This field is required").max(2000),
  bioEnjoy: z.string().trim().min(1, "This field is required").max(2000),
  bioHobbies: z.string().trim().min(1, "This field is required").max(2000),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/profile-schema.ts
git commit -m "Add Zod schema for the Profile admin form"
```

---

### Task 2: Shared `AdminField` component

**Files:**
- Create: `src/components/admin/admin-field.tsx`

**Interfaces:**
- Produces: `<AdminField label name defaultValue error? type? textarea? rows? />` — consumed by Task 3 and every future admin form (Plans 2b–2d).

- [ ] **Step 1: Create `src/components/admin/admin-field.tsx`**

Matches the existing `contact.tsx` input/error pattern (`Input`/`Textarea` + a `text-xs text-destructive` message), generalized with a visible label — appropriate here since admin forms have many more fields per page than the 3-field public contact form, where placeholder text alone was enough.

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
};

export function AdminField({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  textarea = false,
  rows = 3,
}: AdminFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {textarea ? (
        <Textarea id={name} name={name} defaultValue={defaultValue} rows={rows} />
      ) : (
        <Input id={name} name={name} type={type} defaultValue={defaultValue} />
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

This is a Server-Component-compatible component (no `"use client"`, no hooks, no event handlers) — it can be rendered from either a client or server component, so it doesn't force every future form's parent to be a client component.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/admin-field.tsx
git commit -m "Add shared AdminField component for admin forms"
```

---

### Task 3: Profile server action, form, and page

**Files:**
- Create: `src/app/admin/profile/actions.ts`
- Create: `src/app/admin/profile/profile-form.tsx`
- Create: `src/app/admin/profile/page.tsx`

**Interfaces:**
- Consumes: `profileSchema`/`ProfileFormValues` from Task 1, `AdminField` from Task 2, `prisma`/`getProfile` from `@/lib/prisma` (Plan 1).
- Produces: `updateProfile` server action, `<ProfileForm profile={profile} />`, the `/admin/profile` route — consumed by Task 4 (dashboard link).

- [ ] **Step 1: Create `src/app/admin/profile/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/profile-schema";

export type ProfileFormState = {
  errors?: Partial<Record<keyof typeof profileSchema.shape, string>>;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: ProfileFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof profileSchema.shape;
      if (!errors[field]) errors[field] = issue.message;
    }
    return { errors };
  }

  await prisma.profile.update({ where: { id: 1 }, data: parsed.data });
  revalidatePath("/admin/profile");
  revalidatePath("/");

  return { success: true };
}
```

- [ ] **Step 2: Create `src/app/admin/profile/profile-form.tsx`**

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminField } from "@/components/admin/admin-field";
import type { Profile } from "@prisma/client";
import { updateProfile, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = {};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state.success) toast.success("Profile updated.");
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <AdminField label="Name" name="name" defaultValue={profile.name} error={state.errors?.name} />
      <AdminField
        label="Designation"
        name="designation"
        defaultValue={profile.designation}
        error={state.errors?.designation}
      />
      <AdminField
        label="Tagline"
        name="tagline"
        defaultValue={profile.tagline}
        error={state.errors?.tagline}
        textarea
        rows={2}
      />
      <AdminField
        label="Location"
        name="location"
        defaultValue={profile.location}
        error={state.errors?.location}
      />
      <AdminField
        label="Avatar URL"
        name="avatarUrl"
        defaultValue={profile.avatarUrl}
        error={state.errors?.avatarUrl}
      />
      <AdminField
        label="Resume URL"
        name="resumeUrl"
        defaultValue={profile.resumeUrl}
        error={state.errors?.resumeUrl}
      />
      <AdminField
        label="Email"
        name="email"
        type="email"
        defaultValue={profile.email}
        error={state.errors?.email}
      />
      <AdminField label="Phone" name="phone" defaultValue={profile.phone} error={state.errors?.phone} />
      <AdminField
        label="WhatsApp"
        name="whatsapp"
        defaultValue={profile.whatsapp}
        error={state.errors?.whatsapp}
      />
      <AdminField
        label="Bio — Journey"
        name="bioJourney"
        defaultValue={profile.bioJourney}
        error={state.errors?.bioJourney}
        textarea
        rows={5}
      />
      <AdminField
        label="Bio — What I Enjoy"
        name="bioEnjoy"
        defaultValue={profile.bioEnjoy}
        error={state.errors?.bioEnjoy}
        textarea
        rows={5}
      />
      <AdminField
        label="Bio — Hobbies"
        name="bioHobbies"
        defaultValue={profile.bioHobbies}
        error={state.errors?.bioHobbies}
        textarea
        rows={5}
      />

      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/profile/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Edit Profile — Admin" };

export default async function AdminProfilePage() {
  const profile = await getProfile();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <h1 className="mt-6 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Edit Profile
      </h1>

      <div className="mt-8">
        <ProfileForm profile={profile} />
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
git add src/app/admin/profile
git commit -m "Add the Profile editing form (server action, form, page)"
```

---

### Task 4: Link Profile from the dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: the `/admin/profile` route from Task 3.

- [ ] **Step 1: Rewrite `src/app/admin/page.tsx`**

Changes the `sections` array from plain description strings to objects with an optional `href` — `Profile` gets a real link now that its route exists; the other five stay plain text exactly as Plan 1 left them, since their routes still don't exist.

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
};

const sections = [
  {
    label: "Profile",
    href: "/admin/profile",
    description: "Name, designation, tagline, location, contact details, and the three bio paragraphs",
  },
  {
    label: "Skills",
    href: null,
    description: "Skill groups and the entries inside them",
  },
  {
    label: "Education",
    href: null,
    description: "Academic timeline entries",
  },
  {
    label: "Experience",
    href: null,
    description: "Work timeline entries",
  },
  {
    label: "Projects",
    href: null,
    description: "The project grid, including screenshots",
  },
  {
    label: "Case Studies",
    href: null,
    description: "The long-form write-ups",
  },
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        You are authenticated. Every public page on this site now renders straight from the
        database on each request, so a content change shows up on the next page load — no
        rebuild and no deploy.
      </p>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-medium text-foreground">Editable sections</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {sections.map((section) => (
            <li
              key={section.label}
              className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-caramel" />
              <span>
                {section.href ? (
                  <Link href={section.href} className="font-medium text-foreground hover:text-caramel">
                    {section.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{section.label}</span>
                )}
                {" — "}
                {section.description}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "Link Profile from the admin dashboard"
```

---

### Task 5: Full verification pass

**Files:** none (verification only, unless a fix is needed).

- [ ] **Step 1: Typecheck, lint, build**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run lint` — expect 0 errors.
Run: `npm run build` — expect success; `/admin/profile` should appear in the route table as `ƒ` dynamic (it's under the root layout's `force-dynamic`, same as every other route).

- [ ] **Step 2: Confirm `ADMIN_PASSWORD` is set**

Run: `grep -c '^ADMIN_PASSWORD=' .env.local .env`
If neither file has it, ask the human to set one now — this is the step that's been blocked on this since Plan 1. If it's still unset, do Steps 3 onward as far as possible without it (the dashboard link and page structure can still be checked by temporarily reading the rendered HTML/DOM even behind a 401, is not possible — realistically, without the password you can only confirm the code compiles and builds; report this gap explicitly rather than skipping the step).

- [ ] **Step 3: Manual browser pass — the full edit flow**

With the dev server running and `ADMIN_PASSWORD` set:
- Visit `/admin`, log in, confirm "Profile" is now a clickable link and the other five are still plain text.
- Click through to `/admin/profile` — confirm every field is pre-filled with the real current profile data.
- Clear the "Name" field and submit — confirm an inline error appears under that field and nothing was saved (reload and check the value is unchanged).
- Fill it back in, change the "Tagline" to something new, submit — confirm a success toast appears.
- Navigate to `/` (the public homepage) — confirm the Hero section shows the new tagline immediately, no rebuild.
- Change the tagline back to its original value and save again, to leave the live database exactly as it was before this check.

- [ ] **Step 4: Commit (only if a fix was needed)**

```bash
git add [exact files fixed]
git commit -m "Fix [specific issue] found in Profile form verification"
```
