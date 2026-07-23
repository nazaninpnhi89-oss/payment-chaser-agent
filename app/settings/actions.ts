"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { updateOrganisation } from "@/lib/repositories/organisationRepository";

const settingsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  senderName: z.string().min(1, "Sender name is required"),
  replyToEmail: z.string().email("Enter a valid email address"),
  standardPaymentTermsDays: z.coerce.number().int().min(0),
  emailSignOff: z.string().optional(),
});

export type UpdateSettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateSettingsAction(formData: FormData): Promise<UpdateSettingsResult> {
  const parsed = settingsSchema.safeParse({
    businessName: formData.get("businessName"),
    senderName: formData.get("senderName"),
    replyToEmail: formData.get("replyToEmail"),
    standardPaymentTermsDays: formData.get("standardPaymentTermsDays"),
    emailSignOff: formData.get("emailSignOff"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateOrganisation(env.DEFAULT_ORG_ID, {
    ...parsed.data,
    emailSignOff: parsed.data.emailSignOff?.trim() || null,
  });

  revalidatePath("/settings");
  return { success: true };
}
