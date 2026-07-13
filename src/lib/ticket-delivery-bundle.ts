import digitalTemplateArrayBuffer from "../../public/templates/ticket-digital-pink-floyd.png?arrayBuffer";

export function loadBundledDigitalTicketTemplateBytes(): Buffer {
  return Buffer.from(digitalTemplateArrayBuffer);
}
