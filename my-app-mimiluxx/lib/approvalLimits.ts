import type { UserRole } from "@/lib/types/roles";
import { DAY_MS, HOUR_MS } from "@/lib/time";

export type ApprovalLimit = {
  role: UserRole;
  enabled: boolean;
  amount: number;
  unit: "days" | "hours";
  repeat_hours: number;
};

/** Used until an admin saves limits (or if the table has not been created yet). */
export const DEFAULT_LIMITS: ApprovalLimit[] = [
  { role: "Committee Head", enabled: true, amount: 2, unit: "days", repeat_hours: 24 },
  { role: "President", enabled: true, amount: 3, unit: "days", repeat_hours: 0 },
];

export function limitToMs(l: ApprovalLimit): number {
  return l.amount * (l.unit === "days" ? DAY_MS : HOUR_MS);
}
