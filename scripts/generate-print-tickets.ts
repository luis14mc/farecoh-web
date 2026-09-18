import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_TEST_PRINT_FROM,
  DEFAULT_TEST_PRINT_TO,
} from "../src/lib/ticket-print-config.ts";
import {
  buildPrintPdfFilename,
  buildTicketPrintPdf,
  loadPinkFloydPrintTickets,
  parsePrintRange,
} from "../src/lib/ticket-print.ts";
import { formatTicketCode, normalizeTicketCode } from "../src/services/ticket-code.ts";
import { getDbPool } from "../src/lib/db.ts";

const EXPORT_DIR = path.join(process.cwd(), "exports", "print");

function parseCliArgs(argv: string[]) {
  let from = formatTicketCode(1);
  let to = formatTicketCode(500);
  let test = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--test") {
      test = true;
      continue;
    }
    if (arg === "--from" && argv[i + 1]) {
      from = normalizeTicketCode(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--to" && argv[i + 1]) {
      to = normalizeTicketCode(argv[i + 1]);
      i += 1;
    }
  }

  if (test) {
    from = DEFAULT_TEST_PRINT_FROM;
    to = DEFAULT_TEST_PRINT_TO;
  }

  return { from, to, test };
}

async function main() {
  const { from, to, test } = parseCliArgs(process.argv);
  parsePrintRange(from, to);

  const tickets = await loadPinkFloydPrintTickets(from, to);
  const outputPath = path.join(
    EXPORT_DIR,
    test ? "test-5-tickets.pdf" : buildPrintPdfFilename(from, to),
  );

  await mkdir(EXPORT_DIR, { recursive: true });
  const pdfBytes = await buildTicketPrintPdf(tickets);
  await writeFile(outputPath, pdfBytes);

  try {
    await getDbPool().end();
  } catch {}

  console.log(`Generated ${tickets.length} ticket page(s): ${outputPath}`);
  console.log(`Range: ${tickets[0]?.ticket_code} – ${tickets[tickets.length - 1]?.ticket_code}`);
}

main().catch((err) => {
  console.error("Print generation failed:", err);
  process.exit(1);
});
