import { pdf } from 'pdf-to-img'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import path from 'path'

// Resolves the local por.traineddata so Tesseract doesn't try to download from CDN
const LANG_PATH = path.resolve(process.cwd())

// Minimum width in pixels to ensure ~300dpi on A4-ish documents
const MIN_IMAGE_WIDTH = 2480

/**
 * Converts a specific page of a PDF to an image using pdf-to-img,
 * pre-processes it with Sharp, and runs Tesseract OCR.
 */
export async function performOCRForPage(filePath: string, pageNumber: number): Promise<string> {
  try {
    // pdf-to-img renders pages as an async iterable, so we iterate to the desired page
    console.log(`[OCR] Página ${pageNumber}: convertendo PDF para imagem...`)

    const document = await pdf(filePath, { scale: 3.0 })

    let rawBuffer: Buffer | null = null
    let currentPage = 0

    for await (const imageBuffer of document) {
      currentPage++
      if (currentPage === pageNumber) {
        rawBuffer = Buffer.from(imageBuffer)
        break
      }
    }

    if (!rawBuffer || rawBuffer.length === 0) {
      console.warn(`[OCR Warning] Nenhuma imagem gerada para a página ${pageNumber}`)
      return ''
    }

    // Obter metadados da imagem para garantir resolução mínima
    const metadata = await sharp(rawBuffer).metadata()
    const currentWidth = metadata.width || 0

    console.log(`[OCR] Página ${pageNumber}: imagem bruta ${currentWidth}x${metadata.height || 0}px (${(rawBuffer.length / 1024).toFixed(0)} KB)`)

    // Pipeline de pré-processamento otimizado para OCR de documentos escaneados:
    // 1. Grayscale — remove informação de cor desnecessária
    // 2. Normalize — expande o range de contraste para aproveitar 0-255
    // 3. Sharpen — realça bordas de caracteres
    // 4. Threshold — binarização (preto/branco puro), essencial para OCR em docs com fundo acinzentado
    // 5. Resize — garante resolução mínima equivalente a ~300dpi
    let pipeline = sharp(rawBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(140) // Binarização: pixels acima de 140 viram branco, abaixo viram preto

    // Upscale se a imagem estiver abaixo da resolução mínima
    if (currentWidth < MIN_IMAGE_WIDTH) {
      pipeline = pipeline.resize({ width: MIN_IMAGE_WIDTH, withoutEnlargement: false })
      console.log(`[OCR] Página ${pageNumber}: upscale de ${currentWidth}px para ${MIN_IMAGE_WIDTH}px de largura`)
    }

    const processedBuffer = await pipeline.png().toBuffer()

    console.log(`[OCR] Página ${pageNumber}: iniciando Tesseract com idioma 'por' (langPath: ${LANG_PATH})`)

    const { data: { text, confidence } } = await Tesseract.recognize(processedBuffer, 'por', {
      langPath: LANG_PATH,
    })

    console.log(`[OCR] Página ${pageNumber}: concluído — ${text.length} chars, confiança média: ${confidence}%`)

    return text || ''
  } catch (err) {
    console.error(`[OCR Error] Falha no OCR da página ${pageNumber}:`, err)
    return ''
  }
}
