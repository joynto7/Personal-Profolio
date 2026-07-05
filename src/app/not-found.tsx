import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
      <span className="font-heading text-7xl font-medium text-primary">
        404
      </span>
      <h1 className="mt-4 font-heading text-2xl font-medium text-foreground">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to Home</Link>
      </Button>
    </main>
  );
}
