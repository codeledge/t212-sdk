import { z } from "zod";
import { T212 } from "./client";
import { T212EnvironmentSchema } from "./types";

const EnvSchema = z.object({
  T212_API_KEY: z.string().min(1),
  T212_API_SECRET: z.string().min(1),
  T212_ENVIRONMENT: T212EnvironmentSchema,
});

export function createClientFromEnv(): T212 {
  const {
    T212_API_KEY: apiKey,
    T212_API_SECRET: apiSecret,
    T212_ENVIRONMENT: environment,
  } = EnvSchema.parse(process.env);

  return new T212({ apiKey, apiSecret, environment });
}
