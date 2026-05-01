import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/ccs/schema.js",
  out: "./src/lib/ccs/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
