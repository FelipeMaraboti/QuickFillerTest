import { prisma } from '../database/prisma'
import { extractTextFromPDF } from './pdf'
import { performOCRForPage } from './ocr'
import { extrairCartaoPonto } from '../extractors/cartaoPonto'
import { extrairHolerite } from '../extractors/holerite'

const MIN_TEXT_LENGTH_PER_PAGE = 30

export async function processarPDF(id: string, filePath: string, tipo: string) {
  try {
    const rawPagesText = await extractTextFromPDF(filePath)
    const finalPagesText: string[] = []

    for (let pageIdx = 0; pageIdx < rawPagesText.length; pageIdx++) {
      const pageText = rawPagesText[pageIdx] || ''
      const pageNum = pageIdx + 1

      if (pageText.trim().length >= MIN_TEXT_LENGTH_PER_PAGE) {
        console.log(`[${id}] Página ${pageNum}: Usando texto nativo do PDF. (${pageText.trim().length} chars)`)
        finalPagesText.push(pageText)
      } else {
        console.log(`[${id}] Página ${pageNum}: Texto insuficiente (${pageText.trim().length} chars). Executando OCR...`)
        const ocrText = await performOCRForPage(filePath, pageNum)
        finalPagesText.push(ocrText)
      }
    }

    let resultValue: any = null

    if (tipo === 'cartao-ponto') {
      resultValue = extrairCartaoPonto(finalPagesText)
    } else if (tipo === 'holerite') {
      resultValue = extrairHolerite(finalPagesText)
    } else {
      throw new Error(`Tipo de documento desconhecido: ${tipo}`)
    }

    await prisma.transcricao.update({
      where: { id },
      data: {
        status: 'concluido',
        value: JSON.stringify(resultValue)
      }
    })
    console.log(`[${id}] Processamento concluído com sucesso.`)
  } catch (error: any) {
    console.error(`[${id}] Erro no processamento:`, error)
    await prisma.transcricao.update({
      where: { id },
      data: {
        status: 'erro',
        erro: error.message || 'Erro desconhecido durante o processamento'
      }
    })
  }
}
