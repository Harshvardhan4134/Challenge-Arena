/** API rule keys — must match api-server RULE_ALLOWLIST */
export const CHALLENGE_RULE_PRESETS = [
  { id: "headshot_only", label: "Headshot only" },
  { id: "no_gloo_wall", label: "No gloo wall" },
  { id: "no_revive", label: "No revive" },
  { id: "no_spray", label: "No spray" },
  { id: "sniper_only", label: "Sniper only" },
] as const;

const LABELS: Record<string, string> = Object.fromEntries(
  CHALLENGE_RULE_PRESETS.map((p) => [p.id, p.label]),
);

export function formatChallengeRuleId(ruleId: string): string {
  return LABELS[ruleId] ?? ruleId.replace(/_/g, " ");
}
