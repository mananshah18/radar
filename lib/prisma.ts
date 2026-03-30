import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// #31 — cache in all environments to avoid new client on every import
globalForPrisma.prisma = globalForPrisma.prisma ?? prisma;

// ── Tenant isolation middleware ────────────────────────────────
// Throws at dev time if user_id / userId is missing on a tenant query.
// Catches missing scoping before it reaches the DB.
const TENANT_MODELS = ["task", "area"];
const TENANT_ACTIONS = ["findMany", "findFirst", "update", "delete", "count"];

prisma.$use(async (params, next) => {
  if (
    TENANT_MODELS.includes(params.model?.toLowerCase() ?? "") &&
    TENANT_ACTIONS.includes(params.action)
  ) {
    const where = params.args?.where;
    if (!where?.userId && !where?.user_id) {
      throw new Error(
        `[Radar] Tenant isolation violation: missing userId on ${params.model}.${params.action}. ` +
          `Always scope queries to the authenticated user.`
      );
    }
  }
  return next(params);
});
