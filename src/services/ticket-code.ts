const TICKET_PREFIX = "PF";
const TICKET_SEQUENCE_LENGTH = 6;

export function formatTicketCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Ticket sequence must be a positive integer.");
  }

  return `${TICKET_PREFIX}-${String(sequence).padStart(TICKET_SEQUENCE_LENGTH, "0")}`;
}

export function parseTicketSequence(ticketCode: string): number | null {
  const match = ticketCode.trim().toUpperCase().match(/^PF-(\d{6})$/);
  if (!match) return null;
  return Number(match[1]);
}

export function normalizeTicketCode(ticketCode: string): string {
  return ticketCode.trim().toUpperCase();
}

export function isTicketCode(value: string): boolean {
  return /^PF-\d{6}$/.test(normalizeTicketCode(value));
}
