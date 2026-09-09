"use client";
import { VerifiedBadge as NewVerifiedBadge } from "@/components/ui/verified-badge";

// Back-compat wrapper: old API used verificationType, new uses tone
export default function VerifiedBadge({ size = "sm", verificationType, tone, variant, ...props }) {
  // Map old verificationType to new tone
  let resolvedTone = tone;
  if (!resolvedTone && verificationType) {
    if (verificationType === "college_email") resolvedTone = "brand";
    else if (verificationType === "id_card") resolvedTone = "gold";
    else resolvedTone = "brand";
  }
  return <NewVerifiedBadge size={size} tone={resolvedTone || "brand"} variant={variant || "shimmer"} {...props} />;
}

export { NewVerifiedBadge as VerifiedBadge };
