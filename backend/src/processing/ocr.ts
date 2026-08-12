import pdfImg from 'pdf-img-convert'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'

export async function performOCRForPage(filePath: string, pageNumber: number): Promise<string> {
  try {
    // Converter apenas a página desejada em buffer PNG de alta qualidade
    const outputImages = await pdfImg.convert(filePath, {
      page_numbers: [pageNumber],
      scale: 2.0,
    })

    if (!outputImages || outputImages.length === 0) {
      console.warn(`[OCR Warning] Nenhuma imagem gerada para a página ${pageNumber}`)
      return ''
    }

    const rawBuffer = Buffer.from(outputImages[0])

    // Tratar com Sharp para maximizar legibilidade no Tesseract:
    const processedBuffer = await sharp(rawBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer()

    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'por')
    return text || ''
  } catch (err) {
    console.error(`[OCR Error] Falha no OCR da página ${pageNumber}:`, err)
    return ''
  }
}
