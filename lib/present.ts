/**
 * Presentation vocabulary. Plain language for the surface of the product, so
 * the corpus can keep its precise internal names. Nothing here participates in
 * a derivation.
 */

import type { InstitutionArchetype, SegmentId, WorkloadArchetype } from "../corpus/types";

export const SEGMENT_SHORT: Record<SegmentId, string> = {
  "regional-bank": "Regional Bank",
  "credit-union": "Credit Union",
  "digital-lender": "Digital Lender",
  "pc-carrier": "P&C Insurer",
} as Record<SegmentId, string>;

/** Shortest form, for the segmented control on a phone. */
export const SEGMENT_TINY: Record<SegmentId, string> = {
  "regional-bank": "Bank",
  "credit-union": "Credit Union",
  "digital-lender": "Lender",
  "pc-carrier": "Insurer",
} as Record<SegmentId, string>;

export const SEGMENT_TAGLINE: Record<SegmentId, string> = {
  "regional-bank": "Multi-state retail bank with wealth and mortgage servicing.",
  "credit-union": "Community-chartered, member-first, strong indirect auto book.",
  "digital-lender": "Sponsor-bank lender. Chat-first, no branches.",
  "pc-carrier": "Personal lines auto and home across eighteen states.",
} as Record<SegmentId, string>;

export function segmentShort(institution: InstitutionArchetype): string {
  return SEGMENT_SHORT[institution.id] ?? institution.name;
}

export function assetsLabel(institution: InstitutionArchetype): string {
  const v = institution.drivers.totalAssetsUsd.value;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1).replace(/\.0$/, "")}B in assets`;
  return `$${Math.round(v / 1e6)}M in assets`;
}

export const RISK_LABEL: Record<WorkloadArchetype["riskTier"], string> = {
  "tier-1": "High risk",
  "tier-2": "Moderate risk",
  "tier-3": "Low risk",
};

export const OWNER_LABEL: Record<string, string> = {
  "model-risk": "Model Risk",
  compliance: "Compliance",
  "information-security": "Information Security",
  "fraud-operations": "Fraud Operations",
  legal: "Legal",
  "servicing-operations": "Servicing Operations",
  "vendor-management": "Vendor Management",
  "core-platform": "Core Platform",
};

/** $1.3M, $859K, $9K. Compact, for headlines and cards. */
export function compactUsd(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function weeksRange(low: number, high: number): string {
  return low === high ? `${high} wks` : `${low}–${high} wks`;
}
