import type { PostgrestError } from "@supabase/supabase-js";
import type { TicketLayoutType } from "./ticket-layouts/types.ts";

export function parseLayoutTypeParam(raw: string | undefined): TicketLayoutType | null {
  if (raw === "physical" || raw === "digital") return raw;
  return null;
}

export function resolveLayoutTypeParam(params: Record<string, string | undefined>): TicketLayoutType | null {
  return parseLayoutTypeParam(params.layoutType ?? params.type);
}

export function isPostgrestError(error: unknown): error is PostgrestError {
  return Boolean(error && typeof error === "object" && "message" in error && "code" in error);
}

export function isMissingLayoutTableError(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;

  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("ticket_layout_configs") &&
      (message.includes("does not exist") ||
        message.includes("Could not find the table") ||
        message.includes("schema cache")))
  );
}

export function layoutTableMissingMessage(): string {
  return "ticket_layout_configs table is missing. Run the additive migration.";
}

export function logLayoutDbError(context: string, error: PostgrestError): void {
  console.error(`[ticket-layouts] ${context}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

export function jsonLayoutError(
  error: unknown,
  status = 500,
): Response {
  if (error instanceof Error && error.name === "TicketLayoutTableMissingError") {
    return Response.json(
      {
        ok: false,
        message: error.message,
        code: "MISSING_TABLE",
        details: null,
        hint: null,
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  if (isMissingLayoutTableError(error)) {
    return Response.json(
      {
        ok: false,
        message: layoutTableMissingMessage(),
        code: isPostgrestError(error) ? error.code : "MISSING_TABLE",
        details: isPostgrestError(error) ? error.details : null,
        hint: isPostgrestError(error) ? error.hint : null,
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  if (isPostgrestError(error)) {
    logLayoutDbError("database error", error);
    return Response.json(
      {
        ok: false,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected ticket layout error.";
  return Response.json(
    {
      ok: false,
      message,
      code: "LAYOUT_ERROR",
      details: null,
      hint: null,
    },
    { status, headers: { "cache-control": "no-store" } },
    );
}

export function jsonLayoutSuccess<T extends Record<string, unknown>>(payload: T, status = 200): Response {
  return Response.json({ ok: true, ...payload }, { status, headers: { "cache-control": "no-store" } });
}
