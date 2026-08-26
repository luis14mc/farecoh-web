import type { SupabaseClient } from "@supabase/supabase-js";
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

  const sequence = parseTicketSequence(trimmed);
  if (sequence && sequence >= 1) {
    try {
      return formatTicketCode(sequence);
    } catch {
      return null;
    }
  }

  return null;
}

export function parseBandTicketCodesInput(raw: string): string[] {
  const parts = raw.split(/[\s,;]+/).map((part) => parseBandTicketCodeInput(part)).filter(Boolean) as string[];
  return [...new Set(parts)];
}

export function validateBandTicketCodes(codes: string[]): string[] {
  if (codes.length === 0) {
    throw new Error("Indique al menos un código de boleto.");
  }

  if (codes.length > MAX_TICKETS_PER_BATCH) {
    throw new Error(`El límite es de ${MAX_TICKETS_PER_BATCH} boletos por operación.`);
  }

  const invalid = codes.filter((code) => !isTicketCode(code));
  if (invalid.length) {
    throw new Error(`Código inválido: ${invalid.join(", ")}`);
  }

  return codes;
}

export async function listBandMusicianAssignments(supabase: SupabaseClient): Promise<BandMusicianView[]> {
  const { data: musicians, error: musiciansError } = await supabase
    .from("band_musicians")
    .select("id, name, notes")
    .order("name", { ascending: true });

  if (musiciansError) throw musiciansError;

  const { data: assignments, error: assignmentsError } = await supabase
    .from("band_musician_tickets")
    .select("id, musician_id, ticket_code")
    .order("ticket_code", { ascending: true });

  if (assignmentsError) throw assignmentsError;

  const ticketCodes = (assignments ?? []).map((row) => row.ticket_code);
  const statusByCode = new Map<string, string>();

  if (ticketCodes.length > 0) {
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("ticket_code, status")
      .in("ticket_code", ticketCodes);

    if (ticketsError) throw ticketsError;

    for (const ticket of tickets ?? []) {
      statusByCode.set(ticket.ticket_code, ticket.status);
    }
  }

  const ticketsByMusician = new Map<string, BandMusicianTicketView[]>();
  for (const assignment of assignments ?? []) {
    const list = ticketsByMusician.get(assignment.musician_id) ?? [];
    list.push({
      id: assignment.id,
      ticket_code: assignment.ticket_code,
      ticket_status: statusByCode.get(assignment.ticket_code) ?? null,
    });
    ticketsByMusician.set(assignment.musician_id, list);
  }

  return (musicians ?? []).map((musician) => ({
    id: musician.id,
    name: musician.name,
    notes: musician.notes,
    tickets: ticketsByMusician.get(musician.id) ?? [],
  }));
}

export async function createBandMusician(
  supabase: SupabaseClient,
  name: string,
  notes?: string | null,
): Promise<BandMusicianRow> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Indique el nombre del músico.");
  }

  const { data, error } = await supabase
    .from("band_musicians")
    .insert({ name: trimmedName, notes: notes?.trim() || null })
    .select("id, name, notes, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Ya existe un músico llamado ${trimmedName}.`);
    }
    throw error;
  }

  return data as BandMusicianRow;
}

export async function addTicketsToMusician(
  supabase: SupabaseClient,
  musicianId: string,
  rawCodes: string,
): Promise<{ added: string[]; skipped: string[] }> {
  const codes = validateBandTicketCodes(parseBandTicketCodesInput(rawCodes));

  const { data: musician, error: musicianError } = await supabase
    .from("band_musicians")
    .select("id")
    .eq("id", musicianId)
    .maybeSingle();

  if (musicianError) throw musicianError;
  if (!musician) {
    throw new Error("Músico no encontrado.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("band_musician_tickets")
    .select("ticket_code, musician_id")
    .in("ticket_code", codes);

  if (existingError) throw existingError;

  const conflicts = (existing ?? []).filter((row) => row.musician_id !== musicianId);
  if (conflicts.length) {
    throw new Error(
      `Estos boletos ya están asignados: ${conflicts.map((row) => row.ticket_code).join(", ")}`,
    );
  }

  const alreadyAssigned = new Set((existing ?? []).map((row) => row.ticket_code));
  const toInsert = codes.filter((code) => !alreadyAssigned.has(code));

  if (toInsert.length === 0) {
    return { added: [], skipped: codes };
  }

  const rows = toInsert.map((ticket_code) => ({ musician_id: musicianId, ticket_code }));
  const { error: insertError } = await supabase.from("band_musician_tickets").insert(rows);
  if (insertError) throw insertError;

  return {
    added: toInsert,
    skipped: codes.filter((code) => alreadyAssigned.has(code)),
  };
}

export async function removeBandTicketAssignment(supabase: SupabaseClient, assignmentId: string): Promise<void> {
  const { error } = await supabase.from("band_musician_tickets").delete().eq("id", assignmentId);
  if (error) throw error;
}

export async function deleteBandMusician(supabase: SupabaseClient, musicianId: string): Promise<void> {
  const { error } = await supabase.from("band_musicians").delete().eq("id", musicianId);
  if (error) throw error;
}
