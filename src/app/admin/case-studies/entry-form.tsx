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
          Format: {`[{"url": "/images/case-studies/example.png", "caption": "..."}]`} — url must
          be a local /images/... path or a Vercel Blob URL. Leave as <code>[]</code> for none.
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
