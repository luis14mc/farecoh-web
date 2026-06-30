import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_LABELS } from "@/lib/ticket-status";
import { getTicketBadgeVariant } from "@/lib/ticket-status-badge";

interface TicketStatusBadgeProps {
  status: string;
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  return (
    <Badge variant={getTicketBadgeVariant(status)} className={className}>
      {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS] ?? status}
    </Badge>
  );
}
