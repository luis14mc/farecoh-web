import { query, queryRows, queryOne } from "./db.ts";
import { formatTicketCode, isTicketCode, normalizeTicketCode, parseTicketSequence } from "../services/ticket-code.ts";

export interface BandMusicianRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BandMusicianTicketRow {
  id: string;
  musician_id: string;
  ticket_code: string;
  created_at: string;
}

export interface BandMusicianTicketView {
  id: string;
  ticket_code: string;
  ticket_status: string | null;
}

export interface BandMusicianView {
  id: string;
  name: string;
  notes: string | null;
  tickets: BandMusicianTicketView[];
}

const MAX_TICKETS_PER_BATCH = 50;

export function parseBandTicketCodeInput(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  if (isTicketCode(trimmed)) {
    return normalizeTicketCode(trimmed);
  }

  if (/^\d{1,6}$/.test(trimmed)) {
    const sequence = Number(trimmed);
    if (!Number.isInteger(sequence) || sequence < 1) return null;
    try {
      return formatTicketCode(sequence);
    } catch {
      return null;
    }
  }

  const shortPf = trimmed.match(/^PF-(\d{1,6})$/);
  if (shortPf) {
    const sequence = Number(shortPf[1]);
    if (!Number.isInteger(sequence) || sequence < 1) return null;
    try {
      return formatTicketCode(sequence);
    } catch {
      return null;
    }
  }

  return null;
}

export function parseBandTicketCodesInput(raw: string): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const parsed = parts.map(parseBandTicketCodeInput).filter((code): code is string => Boolean(code));
  return Array.from(new Set(parsed));
}

export function validateBandTicketCodes(codes: string[]): string[] {
  if (codes.length === 0) {
    throw new Error("Indique al menos un código.");
  }

  if (codes.length > MAX_TICKETS_PER_BATCH) {
    throw new Error(`No puede asignar más de ${MAX_TICKETS_PER_BATCH} boletos a la vez.`);
  }

  const invalid = codes.filter((code) => {
    try {
      return parseTicketSequence(code) < 1;
    } catch {
      return true;
    }
  });

  if (invalid.length) {
    throw new Error(`Código inválido: ${invalid.join(", ")}`);
  }

  return codes;
}

export async function listBandMusicianAssignments(_client?: any): Promise<BandMusicianView[]> {
  const musicians = await queryRows<BandMusicianRow>(
    "SELECT id, name, notes, created_at, updated_at FROM band_musicians ORDER BY name ASC;"
  );

  const assignments = await queryRows<{ id: string; musician_id: string; ticket_code: string }>(
    "SELECT id, musician_id, ticket_code FROM band_musician_tickets ORDER BY ticket_code ASC;"
  );

  const ticketCodes = assignments.map((row) => row.ticket_code);
  const statusByCode = new Map<string, string>();

  if (ticketCodes.length > 0) {
    const tickets = await queryRows<{ ticket_code: string; status: string }>(
      "SELECT ticket_code, status FROM tickets WHERE ticket_code = ANY($1);",
      [ticketCodes]
    );

    for (const ticket of tickets) {
      statusByCode.set(ticket.ticket_code, ticket.status);
    }
  }

  const ticketsByMusician = new Map<string, BandMusicianTicketView[]>();
  for (const assignment of assignments) {
    const list = ticketsByMusician.get(assignment.musician_id) ?? [];
    list.push({
      id: assignment.id,
      ticket_code: assignment.ticket_code,
      ticket_status: statusByCode.get(assignment.ticket_code) ?? null,
    });
    ticketsByMusician.set(assignment.musician_id, list);
  }

  return musicians.map((musician) => ({
    id: musician.id,
    name: musician.name,
    notes: musician.notes,
    tickets: ticketsByMusician.get(musician.id) ?? [],
  }));
}

export async function createBandMusician(
  _clientOrName: any,
  possibleNameOrNotes?: string | null,
  possibleNotes?: string | null,
): Promise<BandMusicianRow> {
  const name = typeof _clientOrName === "string" ? _clientOrName : (possibleNameOrNotes || "");
  const notes = typeof _clientOrName === "string" ? possibleNameOrNotes : possibleNotes;

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Indique el nombre del músico.");
  }

  try {
    const row = await queryOne<BandMusicianRow>(
      "INSERT INTO band_musicians (name, notes) VALUES ($1, $2) RETURNING id, name, notes, created_at, updated_at;",
      [trimmedName, notes?.trim() || null]
    );

    if (!row) throw new Error("No se pudo crear el músico.");
    return row;
  } catch (error: any) {
    if (error?.code === "23505") {
      throw new Error(`Ya existe un músico llamado ${trimmedName}.`);
    }
    throw error;
  }
}

export async function addTicketsToMusician(
  _clientOrMusicianId: any,
  possibleMusicianIdOrCodes: string,
  possibleCodes?: string,
): Promise<{ added: string[]; skipped: string[] }> {
  const musicianId = typeof _clientOrMusicianId === "string" && possibleCodes === undefined
    ? _clientOrMusicianId
    : (possibleCodes !== undefined ? possibleMusicianIdOrCodes : _clientOrMusicianId);
  const rawCodes = possibleCodes !== undefined ? possibleCodes : possibleMusicianIdOrCodes;

  const codes = validateBandTicketCodes(parseBandTicketCodesInput(rawCodes));

  const musician = await queryOne<{ id: string }>(
    "SELECT id FROM band_musicians WHERE id = $1 LIMIT 1;",
    [musicianId]
  );

  if (!musician) {
    throw new Error("Músico no encontrado.");
  }

  const existing = await queryRows<{ ticket_code: string; musician_id: string }>(
    "SELECT ticket_code, musician_id FROM band_musician_tickets WHERE ticket_code = ANY($1);",
    [codes]
  );

  const conflicts = existing.filter((row) => row.musician_id !== musicianId);
  if (conflicts.length) {
    throw new Error(
      `Estos boletos ya están asignados: ${conflicts.map((row) => row.ticket_code).join(", ")}`,
    );
  }

  const alreadyAssigned = new Set(existing.map((row) => row.ticket_code));
  const toInsert = codes.filter((code) => !alreadyAssigned.has(code));

  if (toInsert.length === 0) {
    return { added: [], skipped: codes };
  }

  for (const ticket_code of toInsert) {
    await query(
      "INSERT INTO band_musician_tickets (musician_id, ticket_code) VALUES ($1, $2) ON CONFLICT DO NOTHING;",
      [musicianId, ticket_code]
    );
  }

  return {
    added: toInsert,
    skipped: codes.filter((code) => alreadyAssigned.has(code)),
  };
}

export async function removeBandTicketAssignment(
  _clientOrId: any,
  possibleId?: string,
): Promise<void> {
  const assignmentId = possibleId || _clientOrId;
  await query("DELETE FROM band_musician_tickets WHERE id = $1;", [assignmentId]);
}

export async function deleteBandMusician(
  _clientOrId: any,
  possibleId?: string,
): Promise<void> {
  const musicianId = possibleId || _clientOrId;
  await query("DELETE FROM band_musicians WHERE id = $1;", [musicianId]);
}
