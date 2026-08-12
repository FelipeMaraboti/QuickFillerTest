import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from 'canvas'
import Tesseract from 'tesseract.js'
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

  const viewport = page.getViewport({ scale: 2 })
  const canvasFactory = new NodeCanvasFactory()
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

  const renderContext = {
    canvasContext: canvasAndContext.context,
    viewport,
    canvasFactory,
  }

  const worker = await Tesseract.createWorker('por')

  try {
    await page.render(renderContext as any).promise
    const imageBuffer = canvasAndContext.canvas.toBuffer('image/png')
    const result = await worker.recognize(imageBuffer)
    return result.data.text
  } finally {
    canvasFactory.destroy(canvasAndContext)
    await worker.terminate()
  }
}
