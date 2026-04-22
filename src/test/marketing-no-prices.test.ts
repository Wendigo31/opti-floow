import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - node built-ins (vitest runs in node)
import { readFileSync, readdirSync, statSync } from "node:fs";
// @ts-ignore
import { join, resolve } from "node:path";
// @ts-ignore
declare const process: { cwd(): string };

/**
 * AUDIT TEST — Marketing pages must not display monetary amounts.
 * Pricing was removed from public-facing pages so competitors cannot see
 * our rates. This test fails the build if any euro amount or price-like
 * pattern reappears in the scanned files.
 *
 * Scope: pages and components shown to non-authenticated visitors
 * (Presentation, Activation pricing/landing sections).
 */

const MARKETING_FILES = [
  "src/pages/Presentation.tsx",
  "src/pages/Activation.tsx",
  "src/components/activation/PricingSection.tsx",
  "src/config/pricingPlans.ts",
];

// Patterns considered as forbidden monetary content.
// We strip strings/JSX text and look for: "49€", "49 €", "49,99€", "€/mois",
// "$ 12", "12 EUR", "12.99 USD", "/mois" preceded by a number, etc.
const FORBIDDEN_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "amount followed by € symbol", regex: /\d+[\.,]?\d*\s*€/ },
  { name: "€ symbol followed by amount", regex: /€\s*\d/ },
  { name: "amount followed by EUR/USD", regex: /\d+[\.,]?\d*\s*(EUR|USD)\b/i },
  { name: "$ followed by amount", regex: /\$\s*\d/ },
  { name: "amount followed by /mois or /an", regex: /\d+[\.,]?\d*\s*\/\s*(mois|an|month|year)\b/i },
  { name: "HT/TTC price suffix with number", regex: /\d+[\.,]?\d*\s*(€|EUR)\s*(HT|TTC)\b/i },
];

// Content we explicitly allow even if it looks numeric (e.g. years, version
// numbers, slide indices). Keep this list intentionally short.
const ALLOWED_LINE_PATTERNS: RegExp[] = [
  /\b(19|20)\d{2}\b/, // years
  /v\d+\.\d+/i, // version numbers
];

function stripCodeNoise(source: string): string {
  // Remove single-line and multi-line comments to reduce false positives
  // from inline notes; keep JSX/string content intact.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function scanFile(path: string): string[] {
  const abs = resolve(process.cwd(), path);
  const raw = readFileSync(abs, "utf8");
  const cleaned = stripCodeNoise(raw);
  const lines = cleaned.split("\n");
  const findings: string[] = [];

  lines.forEach((line, idx) => {
    for (const { name, regex } of FORBIDDEN_PATTERNS) {
      if (regex.test(line)) {
        // Skip obviously-allowed contexts
        if (ALLOWED_LINE_PATTERNS.some((r) => r.test(line) && !regex.test(line.replace(r, "")))) {
          continue;
        }
        findings.push(
          `  L${idx + 1} [${name}] → ${line.trim().slice(0, 160)}`
        );
      }
    }
  });

  return findings;
}

function listMarketingComponentFiles(): string[] {
  // Recursively include every file under src/components/activation in case
  // new marketing components are added later.
  const dir = resolve(process.cwd(), "src/components/activation");
  const out: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isFile() && /\.(tsx?|jsx?)$/.test(entry)) {
        out.push(`src/components/activation/${entry}`);
      }
    }
  } catch {
    // directory may not exist
  }
  return out;
}

describe("Audit — no monetary amounts on marketing pages", () => {
  const filesToScan = Array.from(
    new Set([...MARKETING_FILES, ...listMarketingComponentFiles()])
  );

  for (const file of filesToScan) {
    it(`${file} contains no prices, currency amounts, or "/mois" patterns`, () => {
      const findings = scanFile(file);
      if (findings.length > 0) {
        const message =
          `\n❌ Forbidden monetary content detected in ${file}:\n` +
          findings.join("\n") +
          `\n\nMarketing/public pages must not expose pricing. ` +
          `Replace with "Sur devis" / "Nous contacter" or move the value behind authentication.`;
        throw new Error(message);
      }
      expect(findings).toEqual([]);
    });
  }
});
