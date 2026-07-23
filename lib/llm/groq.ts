import "server-only";
import Groq from "groq-sdk";
import { env } from "@/lib/env";

export const groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
