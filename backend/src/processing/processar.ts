import { prisma } from '../database/prisma'
import { extractTextFromPDF } from './pdf'
import { performOCR } from './ocr'
import { extrairCartaoPonto } from '../extractors/cartaoPonto'
import { extrairHolerite } from '../extractors/holerite'

export async function processarPDF(id: string, filePath: string, tipo: string) {
  try {
    let textPages = await extractTextFromPDF(filePath)

    // Se a primeira página estiver sem texto (ou muito pouco), consideramos escaneado
    // Em produção, iteraríamos verificando cada página, mas vamos verificar se o texto extraído total é quase nulo
    const totalTextLength = textPages.reduce((acc, text) => acc + text.trim().length, 0)
    
    if (totalTextLength < 50) {
      console.log(`[${id}] Documento parece escaneado, rodando OCR...`)
      textPages = await performOCR(filePath)
    }

    let resultValue: any = null

    if (tipo === 'cartao-ponto') {
      resultValue = extrairCartaoPonto(textPages)
    } else if (tipo === 'holerite') {
      resultValue = extrairHolerite(textPages)
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
