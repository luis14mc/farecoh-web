import ticketTemplateArrayBuffer from "../../public/templates/ticket-pink-floyd.png?arrayBuffer";

export function isPngBuffer(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

export function loadBundledTicketTemplateBytes(): Buffer {
  const buffer = Buffer.from(ticketTemplateArrayBuffer);
  if (!isPngBuffer(buffer)) {
    throw new Error("La plantilla empaquetada no es un PNG válido.");
  }
  return buffer;
}
