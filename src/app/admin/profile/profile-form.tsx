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
  }, [state]);

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
