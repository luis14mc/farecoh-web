const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const MULTISPACE = /\s+/g;

export function sanitizeText(value: unknown, maxLength = 240): string {
  if (typeof value !== "string") return "";

  return value
    .replace(CONTROL_CHARS, "")
    .replace(MULTISPACE, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(value: unknown): string {
  return sanitizeText(value, 160).toLowerCase();
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function assertServerSecret(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required in server environment.`);
  }

  return value;
}
