import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from 'canvas'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import fs from 'fs'

export async function performOCRForPage(filePath: string, pageNumber: number): Promise<string> {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath))
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
    })

    const pdfDocument = await loadingTask.promise
    const page = await pdfDocument.getPage(pageNumber)

    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')

    const renderContext = {
      canvasContext: context as any,
      viewport,
    }

    await page.render(renderContext).promise
    const rawBuffer = canvas.toBuffer('image/png')

    // Pré-processamento com Sharp:
    const processedBuffer = await sharp(rawBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer()

    // Rodar OCR com Tesseract.recognize direto (sem criar worker isolado que exige threadpool no Windows)
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'por')
    return text
  } catch (err) {
    console.error(`[OCR Error] Falha no OCR da página ${pageNumber}:`, err)
    return ''
  }
}
