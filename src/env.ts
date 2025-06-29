import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  emptyStringAsUndefined: true,
  server: {
    CLERK_SECRET_KEY: z.string().min(1),
  },
  client: {
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnvStrict: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
});
