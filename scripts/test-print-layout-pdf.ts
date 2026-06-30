import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildTicketPrintPdf } from "../src/lib/ticket-print.ts";
import { formatTicketCode } from "../src/services/ticket-code.ts";

const tickets = Array.from({ length: 5 }, (_, index) => ({
  ticket_code: formatTicketCode(index + 1),
  qr_token: "7b3f4a2e-1c9d-4b8a-9f0e-123456789abc",
}));

const pdfBytes = await buildTicketPrintPdf(tickets);
const outputDir = path.join(process.cwd(), "exports", "print");
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "test-5-tickets.pdf");
await writeFile(outputPath, pdfBytes);

console.log(`Wrote ${tickets.length} ticket page(s) to ${outputPath}`);
