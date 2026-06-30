import type { PhysicalTicketStatus } from "@/types/ticketing";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

export type TicketBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const TICKET_STATUS_BADGE_VARIANT: Record<PhysicalTicketStatus, TicketBadgeVariant> = {
  available: "secondary",
  assigned: "default",
  reserved: "warning",
  sold: "success",
  validated: "purple",
  cancelled: "destructive",
};

export function getTicketBadgeVariant(status: string): TicketBadgeVariant {
  return TICKET_STATUS_BADGE_VARIANT[status as PhysicalTicketStatus] ?? "secondary";
}
