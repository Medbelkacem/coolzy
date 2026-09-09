/**
 * Creates the first admin from the terminal (alternative to /setup).
 * Refuses if an admin already exists.
 *   pnpm admin:create -- --name "Owner" --username owner --password "long password" [--email a@b.c]
 */
import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg("name");
  const username = arg("username")?.toLowerCase();
  const password = arg("password");
  const email = arg("email")?.toLowerCase() || null;
  if (!name || !username || !password) {
    console.error('usage: pnpm admin:create -- --name "Owner" --username owner --password "min 12 chars" [--email a@b.c]');
    process.exit(2);
  }
  if (password.length < 12) {
    console.error("password must be at least 12 characters");
    process.exit(2);
  }
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const existing = await prisma.user.count({ where: { role: "ADMIN" } });
  if (existing > 0) {
    console.error("An admin already exists. Use the admin UI to add staff.");
    process.exit(1);
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { role: "ADMIN", name, username, email, passwordHash, hireDate: new Date() } });
  console.log(`admin created: ${user.username}`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
