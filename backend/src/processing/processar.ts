import { prisma } from '../database/prisma'
import { extractTextFromPDF } from './pdf'
import { performOCRForPage } from './ocr'
import { extrairCartaoPonto } from '../extractors/cartaoPonto'
import { extrairHolerite } from '../extractors/holerite'

/**
 * Threshold mínimo de caracteres para considerar que existe texto nativo.
 * Aumentado de 30 para 100 porque metadata de PDFs escaneados frequentemente
 * contém 30-80 chars de lixo (nomes de fontes, headers do PDF, etc.).
 */
const MIN_TEXT_LENGTH_PER_PAGE = 100

/**
 * Score mínimo para aceitar uma extração como válida sem precisar testar OCR.
 * Valores abaixo disso significam que a extração é suspeita e vale tentar OCR.
 */
const MIN_QUALITY_SCORE = 3

/**
 * Tempo médio estimado por página para cada etapa (em segundos).
 * Usado para calcular a estimativa de tempo restante.
 */
const TEMPO_POR_PAGINA = {
  textoNativo: 0.5,   // Extração de texto nativo é quase instantânea
  ocr: 8,             // OCR é pesado (~8s por página com scale 3.0)
}

/**
 * Calcula um score de qualidade para o resultado de uma extração.
 * Quanto maior, mais confiável o resultado parece ser.
 */
function scoreExtraction(result: any, tipo: string): number {
  if (!result || !result.pages || result.pages.length === 0) return 0

  const page = result.pages[0]
  let score = 0

  if (tipo === 'cartao-ponto') {
    const days = page.days || []
    if (days.length === 0) return 0

    // Cada dia encontrado vale 1 ponto
    score += days.length

    // Bonus por dias com batidas reais (IN/OUT)
    const daysWithPunches = days.filter((d: any) => d.punches && d.punches.length > 0)
    score += daysWithPunches.length * 2

    // Penalidade se nenhum dia tem batidas (provavelmente extraiu lixo como "datas")
    if (daysWithPunches.length === 0 && days.length <= 2) {
      score = Math.max(0, score - 3)
    }

    // Penalidade por batidas com '?' (incerteza do OCR)
    const totalQuestionMarks = days.reduce((acc: number, d: any) => {
      return acc + (d.punches || []).filter((p: any) => p.time_raw.includes('?')).length
    }, 0)
    score -= totalQuestionMarks * 0.5

  } else {
    // Holerite
    const fields = page.fields || []
    const bases = page.bases || []

    if (fields.length === 0 && bases.length === 0) return 0

    // Cada field/base encontrado vale pontos
    score += fields.length * 2
    score += bases.length * 2

    // Bonus se extraiu mês e ano válidos (não '??' ou '????')
    if (page.month && page.month !== '??') score += 2
    if (page.year && page.year !== '????') score += 2

    // Penalidade por valores com '?'
    const fieldsWithQuestions = fields.filter((f: any) => f.value && f.value.includes('?'))
    score -= fieldsWithQuestions.length * 0.5
  }

  return Math.max(0, score)
}

/**
 * Tenta extrair dados de um texto de acordo com o tipo do documento.
 */
function tryExtract(text: string, tipo: string): any {
  try {
    if (tipo === 'cartao-ponto') {
      return extrairCartaoPonto([text])
    } else {
      return extrairHolerite([text])
    }
  } catch {
    return null
  }
}

/**
 * Atualiza o progresso do processamento no banco de dados.
 */
async function atualizarProgresso(
  id: string,
  paginaAtual: number,
  totalPaginas: number,
  etapa: string,
  tempoEstimadoSegundos: number
) {
  const progresso = {
    paginaAtual,
    totalPaginas,
    etapa,
    tempoEstimadoSegundos: Math.max(0, Math.round(tempoEstimadoSegundos)),
  }

  await prisma.transcricao.update({
    where: { id },
    data: { progresso: JSON.stringify(progresso) },
  })
}

export async function processarPDF(id: string, filePath: string, tipo: string) {
  try {
    const startTime = Date.now()

    // Etapa 1: Leitura do PDF
    await atualizarProgresso(id, 0, 0, 'Lendo documento...', -1)
    const rawPagesText = await extractTextFromPDF(filePath)
    const totalPaginas = rawPagesText.length
    const finalPagesText: string[] = []

    // Estimativa inicial: assumir que todas as páginas precisarão de OCR (pior caso)
    // Será refinada à medida que processamos cada página
    let paginasRestantesOCR = totalPaginas
    let paginasRestantesNativo = 0
    const temposReais: number[] = [] // Para refinar a estimativa com dados reais

    for (let pageIdx = 0; pageIdx < rawPagesText.length; pageIdx++) {
      const pageText = rawPagesText[pageIdx] || ''
      const pageNum = pageIdx + 1
      const textLength = pageText.trim().length
      const pageStartTime = Date.now()

      console.log(`[${id}] Página ${pageNum}: texto nativo possui ${textLength} chars`)

      // Calcular tempo estimado restante baseado no que sabemos
      const paginasRestantes = totalPaginas - pageIdx
      const tempoMedioPorPagina = temposReais.length > 0
        ? temposReais.reduce((a, b) => a + b, 0) / temposReais.length / 1000
        : TEMPO_POR_PAGINA.ocr // Assume OCR como pior caso inicialmente
      const tempoEstimado = paginasRestantes * tempoMedioPorPagina

      // Estratégia: tentar texto nativo, calcular score, e se insuficiente, tentar OCR.
      // Se ambos produzirem resultados, usar o de maior score.

      let nativeScore = 0
      let nativeResult: any = null
      let usouOCR = false

      if (textLength >= MIN_TEXT_LENGTH_PER_PAGE) {
        nativeResult = tryExtract(pageText, tipo)
        nativeScore = scoreExtraction(nativeResult, tipo)
        console.log(`[${id}] Página ${pageNum}: score do texto nativo = ${nativeScore}`)
      } else {
        console.log(`[${id}] Página ${pageNum}: texto nativo muito curto (${textLength} < ${MIN_TEXT_LENGTH_PER_PAGE}), pulando direto para OCR`)
      }

      // Se o score nativo é alto o suficiente, usá-lo diretamente
      if (nativeScore >= MIN_QUALITY_SCORE) {
        console.log(`[${id}] Página ${pageNum}: ✅ texto nativo ACEITO (score ${nativeScore} >= ${MIN_QUALITY_SCORE})`)
        finalPagesText.push(pageText)
      } else {
        // Score nativo insuficiente — executar OCR
        usouOCR = true
        await atualizarProgresso(id, pageNum, totalPaginas, `OCR da página ${pageNum}/${totalPaginas}...`, tempoEstimado)

        console.log(`[${id}] Página ${pageNum}: score nativo insuficiente (${nativeScore}). Executando OCR...`)
        const ocrText = await performOCRForPage(filePath, pageNum)
        const ocrResult = tryExtract(ocrText, tipo)
        const ocrScore = scoreExtraction(ocrResult, tipo)
        console.log(`[${id}] Página ${pageNum}: score do OCR = ${ocrScore}`)

        // Usar o texto com melhor score
        if (ocrScore > nativeScore) {
          console.log(`[${id}] Página ${pageNum}: ✅ usando OCR (score ${ocrScore} > nativo ${nativeScore})`)
          finalPagesText.push(ocrText)
        } else if (nativeScore > 0) {
          console.log(`[${id}] Página ${pageNum}: ✅ usando texto nativo (score ${nativeScore} >= OCR ${ocrScore})`)
          finalPagesText.push(pageText)
        } else {
          // Ambos falharam — usar OCR mesmo assim (pode ter extraído algo parcial)
          console.log(`[${id}] Página ${pageNum}: ⚠️ ambos falharam. Usando OCR como fallback.`)
          finalPagesText.push(ocrText || pageText)
        }
      }

      // Registrar tempo real desta página para refinar estimativas futuras
      const pageElapsed = Date.now() - pageStartTime
      temposReais.push(pageElapsed)

      // Atualizar progresso após processar a página
      const paginasRestantesAgora = totalPaginas - pageNum
      const tempoMedioAtualizado = temposReais.reduce((a, b) => a + b, 0) / temposReais.length / 1000
      const tempoEstimadoRestante = paginasRestantesAgora * tempoMedioAtualizado

      const etapaDescricao = usouOCR
        ? `Página ${pageNum}/${totalPaginas} processada (OCR)`
        : `Página ${pageNum}/${totalPaginas} processada (texto nativo)`

      await atualizarProgresso(id, pageNum, totalPaginas, etapaDescricao, tempoEstimadoRestante)
    }

    // Etapa final: Extração dos dados estruturados
    await atualizarProgresso(id, totalPaginas, totalPaginas, 'Estruturando dados extraídos...', 1)

    let resultValue: any = null

    if (tipo === 'cartao-ponto') {
      resultValue = extrairCartaoPonto(finalPagesText)
    } else if (tipo === 'holerite') {
      resultValue = extrairHolerite(finalPagesText)
    } else {
      throw new Error(`Tipo de documento desconhecido: ${tipo}`)
    }

    const tempoTotal = ((Date.now() - startTime) / 1000).toFixed(1)

    await prisma.transcricao.update({
      where: { id },
      data: {
        status: 'concluido',
        value: JSON.stringify(resultValue),
        progresso: JSON.stringify({
          paginaAtual: totalPaginas,
          totalPaginas,
          etapa: `Concluído em ${tempoTotal}s`,
          tempoEstimadoSegundos: 0,
        }),
      }
    })
    console.log(`[${id}] Processamento concluído com sucesso em ${tempoTotal}s.`)
  } catch (error: any) {
    console.error(`[${id}] Erro no processamento:`, error)
    await prisma.transcricao.update({
      where: { id },
      data: {
        status: 'erro',
        erro: error.message || 'Erro desconhecido durante o processamento',
        progresso: null,
      }
    })
  }
}
