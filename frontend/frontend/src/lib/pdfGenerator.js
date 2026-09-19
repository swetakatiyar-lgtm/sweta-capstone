// Real PDF generation for tailored resumes — client-side via jsPDF, no
// backend required. Turns the tailored resume's markdown-ish content
// (## headings, - bullets, plain paragraphs — the same shape
// services/resumeGenerator.js asks Groq to produce) into an actual
// paginated, readable PDF file. This is the only place a resume PDF gets
// built; reuse this for any other future "download resume as PDF" need
// instead of adding a second generator.
import jsPDF from "jspdf";

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5.6;

function parseResumeMarkdown(content) {
  // Turns the generated text into a flat list of typed blocks so the
  // layout pass below never has to re-parse markdown mid-render.
  const lines = String(content ?? "").split(/\r?\n/);
  const blocks = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "space" });
    } else if (/^#{1,3}\s+/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/^#{1,3}\s+/, "") });
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push({ type: "bullet", text: line.replace(/^[-*]\s+/, "") });
    } else {
      blocks.push({ type: "text", text: line });
    }
  }
  return blocks;
}

/**
 * generateResumePDF({ candidateName, role, company, content })
 *
 * Builds a real jsPDF document from the tailored resume's actual generated
 * content — nothing here invents resume text; it only lays out what was
 * already produced by services/resumeGenerator.js. Returns the jsPDF
 * instance so the caller decides whether to `.save()` it directly or pull
 * a Blob for other uses.
 */
export function generateResumePDF({ candidateName, role, company, content }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // Header — real candidate name + the real role/company this was tailored for.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(candidateName || "Resume", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(`Tailored for ${role} at ${company}`, MARGIN, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;
  doc.setTextColor(20, 20, 20);

  const blocks = parseResumeMarkdown(content);

  for (const block of blocks) {
    if (block.type === "space") {
      y += LINE_HEIGHT * 0.4;
      continue;
    }

    if (block.type === "heading") {
      ensureSpace(LINE_HEIGHT * 2);
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(90, 70, 220);
      doc.text(block.text, MARGIN, y);
      y += 2;
      doc.setDrawColor(230, 226, 255);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += LINE_HEIGHT;
      doc.setTextColor(20, 20, 20);
      continue;
    }

    doc.setFont("helvetica", block.type === "bullet" ? "normal" : "normal");
    doc.setFontSize(10.5);
    const indent = block.type === "bullet" ? 5 : 0;
    const prefix = block.type === "bullet" ? "•  " : "";
    const wrapped = doc.splitTextToSize(`${prefix}${block.text}`, CONTENT_WIDTH - indent);
    for (const line of wrapped) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, MARGIN + indent, y);
      y += LINE_HEIGHT;
    }
  }

  return doc;
}

/** Convenience wrapper — generates and immediately triggers a real file download. */
export function downloadResumePDF({ candidateName, role, company, content, filename }) {
  const doc = generateResumePDF({ candidateName, role, company, content });
  doc.save(filename);
}
