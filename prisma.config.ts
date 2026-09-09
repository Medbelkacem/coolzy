import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Migrations use the direct (unpooled) URL when one is provided.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "",
  },
});
