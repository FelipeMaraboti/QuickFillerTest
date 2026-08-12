import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas, Canvas, Image } from 'canvas'
import Tesseract from 'tesseract.js'

// Polyfill global para o pdfjs-dist no Node.js
if (typeof globalThis.HTMLCanvasElement === 'undefined') {
  ;(globalThis as any).HTMLCanvasElement = Canvas
}
if (typeof globalThis.Image === 'undefined') {
  ;(globalThis as any).Image = Image
}

// Simulação de DOM para pdfjs rodar no node
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    return {
      canvas,
      context,
    }
  }
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width
    canvasAndContext.canvas.height = height
  }
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0
    canvasAndContext.canvas.height = 0
    canvasAndContext.canvas = null
    canvasAndContext.context = null
  }
}

export async function performOCR(filePath: string): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ url: filePath, useSystemFonts: true })
  const pdfDocument = await loadingTask.promise
  const pagesText: string[] = []

  // Inicializar o worker do Tesseract
  const worker = await Tesseract.createWorker('por')

  const canvasFactory = new NodeCanvasFactory()

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 }) // Escala maior para OCR melhor
    
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

    const renderContext = {
      canvasContext: canvasAndContext.context as any,
      viewport,
      canvasFactory
    }

    await (page as any).render(renderContext).promise

    // Converter canvas para buffer
    const buffer = canvasAndContext.canvas.toBuffer('image/png')
    
    // Rodar OCR
    const { data: { text } } = await worker.recognize(buffer)
    pagesText.push(text)
    
    canvasFactory.destroy(canvasAndContext)
  }

  await worker.terminate()
  return pagesText
}
