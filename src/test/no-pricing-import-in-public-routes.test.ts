import { describe, it, expect } from "vitest";
// @ts-ignore
import { readFileSync, readdirSync, statSync } from "node:fs";
// @ts-ignore
import { join, resolve } from "node:path";
// @ts-ignore
declare const process: { cwd(): string };

/**
 * AUDIT TEST — `src/config/pricingPlans.ts` MUST NOT be imported from any
 * file reachable on public/unauthenticated routes.
 *
 * Public routes today: `/` (Activation) and `/presentation`.
 * Allowed importers: only the dedicated PricingSection component (which is
 * itself behind authenticated/internal usage) and the internal export page.
 *
 * Goal: prevent a future UI change from re-exposing pricing data to
 * non-authenticated visitors by importing PUBLIC_PLANS into a marketing
 * file.
 */

const FORBIDDEN_IMPORTERS = [
  "src/pages/Presentation.tsx",
  "src/pages/Activation.tsx",
];

const FORBIDDEN_DIRS = [
  "src/components/onboarding",
  "src/components/layout",
];

const IMPORT_PATTERN =
  /from\s+['"](?:@\/config\/pricingPlans|\.{1,2}\/(?:[^'"]+\/)?config\/pricingPlans)['"]/;

function listFiles(relDir: string): string[] {
  const abs = resolve(process.cwd(), relDir);
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(abs);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(abs, entry);
    const rel = `${relDir}/${entry}`;
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...listFiles(rel));
    } else if (stat.isFile() && /\.(tsx?|jsx?)$/.test(entry)) {
      out.push(rel);
    }
  }
  return out;
}

function fileImportsPricing(path: string): boolean {
  try {
    const raw = readFileSync(resolve(process.cwd(), path), "utf8");
    return IMPORT_PATTERN.test(raw);
  } catch {
    return false;
  }
}

describe("Audit — pricingPlans.ts must not leak into public routes", () => {
  const filesToCheck = Array.from(
    new Set([
      ...FORBIDDEN_IMPORTERS,
      ...FORBIDDEN_DIRS.flatMap(listFiles),
    ])
  );

  for (const file of filesToCheck) {
    it(`${file} does not import @/config/pricingPlans`, () => {
      const leaks = fileImportsPricing(file);
      if (leaks) {
        throw new Error(
          `\n❌ Forbidden import detected in ${file}:\n` +
            `  This file is reachable from a public/unauthenticated route ` +
            `and must NOT import "@/config/pricingPlans".\n` +
            `  Move pricing-aware UI behind authentication or refactor ` +
            `the component to receive plan data as props from an internal page.`
        );
      }
      expect(leaks).toBe(false);
    });
  }
});
