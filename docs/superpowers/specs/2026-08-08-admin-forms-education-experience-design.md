# Admin Forms — Education & Experience (Plan 2b) — design

**Status:** Approved, ready for implementation plan
**Date:** 2026-08-08

## Context

Plan 2a shipped the shared admin-form pattern (Zod schema → server action →
`AdminField` form → `revalidatePath`) for `Profile`, a singleton row. The
next two sections on the dashboard — Education and Experience — are lists
(`EducationEntry[]`, `ExperienceEntry[]`, each with an `order: Int` column),
so they need create/delete/reorder on top of the update-only pattern Profile
established. This plan builds that once for Education, then repeats the
identical shape for Experience — the two models don't share a form
component, since their fields differ enough (`institution`/`degree`/`field`
vs `company`/`role`, `achievements` vs `highlights`) that forcing a shared
abstraction would cost more than it saves at this size.

## Decisions

1. **List page + separate edit page**, not one page with inline
   expand/edit-in-place cards. Each entity gets `page.tsx` (list),
   `new/page.tsx` (create), and `[id]/page.tsx` (edit) — mirrors how
   `/projects/[slug]` and `/case-studies/[slug]` already work on the public
   side of this codebase.
2. **Reordering via ▲▼ buttons that swap `order` with the adjacent row**, not
   drag-and-drop. No new dependency (no drag library is installed), no
   client-side state — each button is a plain `<form>` bound to a server
   action, so it works with JS disabled.
3. **Array fields as one `Textarea`, newline-separated**, not repeatable
   text inputs. `achievements`/`highlights` render through the existing
   `AdminField` component (already supports `textarea`) with one item per
   line; the Zod schema splits/trims/filters blank lines on submit. No new
   UI component, no client-side array state.
4. **Delete confirmed via native `window.confirm()`**, not a dialog
   component — there's no Dialog component in the UI kit yet, and adding
   one for a single admin-only confirmation isn't justified.
5. **Create redirects to the list page on success; edit stays on the page
   with a toast.** Create has no natural "you're done" state to linger on
   (the entry didn't exist a moment ago); redirecting back to the list where
   the new row is now visible is the confirmation. Edit follows the exact
   pattern Profile already established (`useActionState`, inline errors,
   success toast).

## Data model (unchanged, from Plan 1)

```
EducationEntry: institution, degree, field, startYear, endYear,
                description?, achievements: string[], order
ExperienceEntry: company, role, startDate, endDate, description,
                 highlights: string[], order
```

No schema migration in this plan — both tables already exist and are seeded.

## Routes & files

Repeated once for `education`, once for `experience` (paths below use
`education`; `experience` is identical in shape):

```
src/lib/education-schema.ts        Zod schema + inferred type
src/app/admin/education/
  actions.ts                       createEducationEntry, updateEducationEntry,
                                    deleteEducationEntry, moveEducationEntry
  entry-form.tsx                   "use client" — shared by new/ and [id]/
  page.tsx                         list, ordered by `order asc`
  new/page.tsx                     renders <EntryForm mode="create">
  [id]/page.tsx                    fetches by id, notFound() if missing,
                                    renders <EntryForm mode="edit">
```

Plus one new shared component used by both list pages:

```
src/components/admin/confirm-delete-form.tsx
```

`AdminField` (Plan 2a) is reused as-is — no changes needed.

## Server actions

- `createXEntry(_prevState, formData)` — Zod-validates, computes
  `order = (max existing order) + 1` (or `0` if the table is empty), inserts,
  `revalidatePath` the list route and `/`, then `redirect()` to the list
  route. Matches `updateProfile`'s `{errors?, message?}` shape for the
  validation-failure path (redirect only happens on success).
- `updateXEntry(id, _prevState, formData)` — Zod-validates, updates by id,
  revalidates, returns `{success: true}` — identical shape to `updateProfile`.
- `deleteXEntry(id)` — deletes by id, revalidates. No `useActionState`
  (nothing to show inline); wraps the Prisma call in try/catch, logs, and
  rethrows on failure so Next's error boundary catches it instead of
  silently swallowing the error.
- `moveXEntry(id, direction: "up" | "down")` — inside a transaction, finds
  the adjacent entry in that direction (next lower/higher `order`) and swaps
  the two `order` values. Same try/catch/rethrow as delete. The list page
  only renders the ▲ button for rows after the first and the ▼ button for
  rows before the last, so the action is never invoked with no neighbor to
  swap with.

All four follow the existing convention: plain Next.js server actions
(`"use server"`), no separate REST layer, Zod as the only validation layer.

## Form component

One `entry-form.tsx` per entity, parameterized by `mode: "create" | "edit"`
and an optional existing entry (undefined in create mode → all fields
default to empty strings). Built from `AdminField`, exactly like
`ProfileForm`. Array fields pass `entry.achievements.join("\n")` as
`defaultValue` when editing.

## Error handling

- Validation errors (empty required field, etc.) render inline under the
  relevant `AdminField`, same as Profile.
- A Prisma write failure in create/update returns `{message: "Could not
  save. Please try again."}`, shown via the same toast pattern Profile uses.
- A Prisma write failure in delete/move has no state channel to report
  through (plain forms, no `useActionState`) — it's allowed to throw and hit
  Next's default error boundary, which is preferable to a caught-and-ignored
  failure.

## Testing

No new test infrastructure. Verified the same way Plan 2a was: `tsc
--noEmit`, `npm run lint`, `npm run build`, then a manual browser pass
covering create → appears in list at the end → edit → validation error →
successful save → reorder with ▲/▼ → delete with confirm cancelled → delete
confirmed → confirm the public homepage reflects the change with no rebuild.

## New dependencies

None. Zod, `sonner`, and the existing UI components are all already in use.

## Explicitly out of scope

- Drag-and-drop reordering (see Decisions)
- A shared generic form/list component across Education and Experience
  (their field sets differ enough that this isn't a real abstraction yet —
  revisit if a third list-shaped entity shows the same pattern a third time)
- Bulk delete / bulk reorder
- Undo for delete
