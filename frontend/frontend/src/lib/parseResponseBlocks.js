// Splits a raw markdown AI response into typed blocks so the renderer can
// treat tables and callouts specially instead of letting react-markdown
// print raw pipes/angle-brackets. Everything else stays as markdown text,
// still rendered through react-markdown for correct inline formatting.

const CALLOUT_KEYWORDS = [
  { match: /^pro\s*tip\b[:\-—]?\s*/i, kind: "tip", title: "Pro Tip" },
  { match: /^tip\b[:\-—]?\s*/i, kind: "tip", title: "Tip" },
  { match: /^warning\b[:\-—]?\s*/i, kind: "warning", title: "Warning" },
  { match: /^caution\b[:\-—]?\s*/i, kind: "warning", title: "Caution" },
  { match: /^success\b[:\-—]?\s*/i, kind: "success", title: "Success" },
  { match: /^important\b[:\-—]?\s*/i, kind: "important", title: "Important" },
  { match: /^note\b[:\-—]?\s*/i, kind: "important", title: "Note" },
];

function stripLeadingBold(line) {
  return line.replace(/^\*\*(.+?)\*\*/, "$1");
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function cleanCell(cell) {
  return cell
    .trim()
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+>/g, "") // strip any other stray HTML tags
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(cleanCell);
}

function classifyCallout(lines) {
  const cleaned = lines.map((l) => l.replace(/^>\s?/, ""));
  const firstLine = stripLeadingBold(cleaned[0] || "").trim();

  for (const { match, kind, title } of CALLOUT_KEYWORDS) {
    if (match.test(firstLine)) {
      const rest = firstLine.replace(match, "").trim();
      const body = [rest, ...cleaned.slice(1)].filter(Boolean).join("\n");
      return { kind, title, body };
    }
  }

  return { kind: "quote", title: null, body: cleaned.join("\n") };
}

export function parseResponseBlocks(text) {
  if (!text) return [];

  const lines = text.split("\n");
  const blocks = [];
  let buffer = [];

  const flushMarkdown = () => {
    const content = buffer.join("\n").trim();
    if (content) blocks.push({ type: "markdown", content });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table: a row line immediately followed by a separator line.
    if (isTableRow(line) && lines[i + 1] && isTableSeparator(lines[i + 1])) {
      flushMarkdown();
      const headers = splitRow(line);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      blocks.push({ type: "table", headers, rows });
      i = j - 1;
      continue;
    }

    // Callout / quote: a run of consecutive `>` lines.
    if (/^>\s?/.test(line)) {
      flushMarkdown();
      const quoteLines = [];
      let j = i;
      while (j < lines.length && /^>\s?/.test(lines[j])) {
        quoteLines.push(lines[j]);
        j++;
      }
      blocks.push({ type: "callout", ...classifyCallout(quoteLines) });
      i = j - 1;
      continue;
    }

    buffer.push(line);
  }

  flushMarkdown();
  return blocks;
}
