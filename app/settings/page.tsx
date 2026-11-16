import { env } from "@/lib/env";
import { getOrganisation } from "@/lib/repositories/organisationRepository";
import { SettingsForm } from "@/components/settings-form";

// Reads the database on every request — must never be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          These details are used as sender information and context in every chase email drafted.
        </p>
      </div>
      <SettingsForm organisation={organisation} />
    </div>
  );
}
