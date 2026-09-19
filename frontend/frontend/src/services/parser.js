// Real text extraction from uploaded files — this is what makes Groq's
// analysis actually read the document instead of guessing from a filename.
// PDF uses pdf.js directly (react-pdf's engine); DOCX uses mammoth. Images
// have no OCR here — that's a real, stated limitation, not faked.

import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function extractTextFromPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return { text: pages.join('\n\n'), pageCount: pdf.numPages }
}

export async function extractTextFromDocx(arrayBuffer) {
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  return { text: value, pageCount: null }
}

/**
 * extractText(file) — dispatches by mime/extension.
 * @returns {Promise<{ text: string, pageCount: number|null, supported: boolean }>}
 */
export async function extractText(file) {
  const name = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')

  try {
    if (isPdf) {
      const buffer = await file.arrayBuffer()
      const { text, pageCount } = await extractTextFromPdf(buffer)
      return { text, pageCount, supported: true }
    }
    if (isDocx) {
      const buffer = await file.arrayBuffer()
      const { text } = await extractTextFromDocx(buffer)
      return { text, pageCount: null, supported: true }
    }
  } catch (err) {
    console.error('Text extraction failed:', err)
    return { text: '', pageCount: null, supported: false, error: true }
  }

  // Images (PNG/JPG) — no OCR implemented. Honest limitation, not faked text.
  return { text: '', pageCount: null, supported: false }
}
