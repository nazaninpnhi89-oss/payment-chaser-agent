import { env } from "@/lib/env";
import { getOrganisation } from "@/lib/repositories/organisationRepository";
import { SettingsForm } from "@/components/settings-form";

// Reads the database on every request — must never be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your business details. They&apos;re used as the sender and sign-off in every reminder drafted.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-xs">
        <SettingsForm organisation={organisation} />
      </div>
    </div>
  );
}
