import type { Role } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; username: string; name: string | null } & Omit<DefaultSession["user"], "name">;
  }
  interface User {
    role: Role;
    username: string;
    shiftEnd?: number;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    username?: string;
    shiftEnd?: number;
  }
}
