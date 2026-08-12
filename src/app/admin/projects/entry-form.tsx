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
