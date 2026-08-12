import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs'

export async function extractTextFromPDF(filePath: string): Promise<string[]> {
  const data = new Uint8Array(fs.readFileSync(filePath))
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  })

  const pdf = await loadingTask.promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    const text = content.items
      .map((item: any) => item.str)
      .join(' ')
      .trim()

    pages.push(text)
  }

  return pages
}
