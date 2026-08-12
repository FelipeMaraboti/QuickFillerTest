import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from 'canvas'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import fs from 'fs'

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    return {
      canvas,
      context,
    }
  }

  reset(
    canvasAndContext: {
      canvas: ReturnType<typeof createCanvas>
      context: any
    },
    width: number,
    height: number
  ) {
    canvasAndContext.canvas.width = width
    canvasAndContext.canvas.height = height
  }

  destroy(canvasAndContext: {
    canvas: ReturnType<typeof createCanvas>
    context: any
  }) {
    canvasAndContext.canvas.width = 0
    canvasAndContext.canvas.height = 0
  }
}

export async function performOCRForPage(filePath: string, pageNumber: number): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(filePath))
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  })

  const pdfDocument = await loadingTask.promise
  const page = await pdfDocument.getPage(pageNumber)

  const viewport = page.getViewport({ scale: 2.5 }) // Aumentar escala para 2.5x melhora muito imagens escaneadas
  const canvasFactory = new NodeCanvasFactory()
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

  const renderContext = {
    canvasContext: canvasAndContext.context,
    viewport,
    canvasFactory,
  }

  try {
    await page.render(renderContext as any).promise
    const rawBuffer = canvasAndContext.canvas.toBuffer('image/png')

    // Pré-processamento com Sharp para documentos escaneados/fotos:
    // 1. Escala de cinza (grayscale)
    // 2. Normalização de iluminação (normalize)
    // 3. Sharpen (nitidez dos numéricos/dígitos)
    const processedBuffer = await sharp(rawBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer()

    // Rodar Tesseract OCR na imagem tratada
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'por')
    return text
  } catch (err) {
    console.error(`[OCR Error] Falha no OCR da página ${pageNumber}:`, err)
    return ''
  } finally {
    canvasFactory.destroy(canvasAndContext)
  }
}
