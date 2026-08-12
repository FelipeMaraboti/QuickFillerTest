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

export async function performOCR(filePath: string): Promise<string[]> {
  const data = new Uint8Array(fs.readFileSync(filePath))
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  })

  const pdfDocument = await loadingTask.promise
  const pagesText: string[] = []

  const worker = await Tesseract.createWorker('por')
  const canvasFactory = new NodeCanvasFactory()

  try {
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i)

      const viewport = page.getViewport({
        scale: 2,
      })

      const canvasAndContext = canvasFactory.create(
        viewport.width,
        viewport.height
      )

      const renderContext = {
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory,
      }

      await page.render(renderContext as any).promise

      const imageBuffer = canvasAndContext.canvas.toBuffer('image/png')
      const result = await worker.recognize(imageBuffer)

      pagesText.push(result.data.text)
      canvasFactory.destroy(canvasAndContext)
    }
  } finally {
    await worker.terminate()
  }

  return pagesText
}
