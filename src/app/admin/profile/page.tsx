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
