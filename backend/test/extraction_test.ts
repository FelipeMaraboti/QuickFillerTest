/**
 * Teste de extração end-to-end.
 * Pega PDFs reais do uploads/ e roda o pipeline completo:
 *   pdf-parse → scoring → OCR fallback (pdf-to-img + tesseract) → extrator
 */
import fs from 'fs'
import path from 'path'
import { extractTextFromPDF } from '../src/processing/pdf'
import { performOCRForPage } from '../src/processing/ocr'
import { extrairCartaoPonto } from '../src/extractors/cartaoPonto'
import { extrairHolerite } from '../src/extractors/holerite'

const uploadsDir = path.join(__dirname, '..', 'uploads')
const MIN_TEXT_LENGTH_PER_PAGE = 100
const MIN_QUALITY_SCORE = 3

function scoreExtraction(result: any, tipo: string): number {
  if (!result || !result.pages || result.pages.length === 0) return 0
  const page = result.pages[0]
  let score = 0
  if (tipo === 'cartao-ponto') {
    const days = page.days || []
    if (days.length === 0) return 0
    score += days.length
    const daysWithPunches = days.filter((d: any) => d.punches && d.punches.length > 0)
    score += daysWithPunches.length * 2
    if (daysWithPunches.length === 0 && days.length <= 2) score = Math.max(0, score - 3)
  } else {
    const fields = page.fields || []
    const bases = page.bases || []
    if (fields.length === 0 && bases.length === 0) return 0
    score += fields.length * 2 + bases.length * 2
    if (page.month && page.month !== '??') score += 2
    if (page.year && page.year !== '????') score += 2
  }
  return Math.max(0, score)
}

function tryExtract(text: string, tipo: string): any {
  try {
    return tipo === 'cartao-ponto' ? extrairCartaoPonto([text]) : extrairHolerite([text])
  } catch { return null }
}

async function testPage(filePath: string, pageText: string, pageNum: number, tipo: string) {
  const textLen = pageText.trim().length
  console.log(`\n--- Página ${pageNum} ---`)
  console.log(`  Texto nativo: ${textLen} chars`)

  if (textLen > 0 && textLen <= 300) {
    console.log(`  Preview: "${pageText.trim().substring(0, 200).replace(/\n/g, '\\n')}"`)
  }

  let nativeScore = 0
  let nativeResult: any = null
  if (textLen >= MIN_TEXT_LENGTH_PER_PAGE) {
    nativeResult = tryExtract(pageText, tipo)
    nativeScore = scoreExtraction(nativeResult, tipo)
    console.log(`  Score nativo: ${nativeScore}`)
    printResult(nativeResult, tipo)
  } else {
    console.log(`  ⚠️  Texto muito curto`)
  }

  if (nativeScore >= MIN_QUALITY_SCORE) {
    console.log(`  ✅ Texto nativo ACEITO (score ${nativeScore})`)
    return { winner: 'NATIVO', score: nativeScore }
  }

  console.log(`  🔍 Rodando OCR...`)
  const ocrText = await performOCRForPage(filePath, pageNum)
  const ocrResult = tryExtract(ocrText, tipo)
  const ocrScore = scoreExtraction(ocrResult, tipo)
  console.log(`  Score OCR: ${ocrScore}`)
  printResult(ocrResult, tipo)

  const winner = ocrScore > nativeScore ? 'OCR' : (nativeScore > 0 ? 'NATIVO' : 'OCR (fallback)')
  console.log(`  ✅ Decisão: ${winner}`)
  return { winner, score: Math.max(ocrScore, nativeScore) }
}

function printResult(result: any, tipo: string) {
  if (!result) return
  const p = result.pages[0]
  if (tipo === 'cartao-ponto') {
    const days = p?.days || []
    const daysWithPunches = days.filter((d: any) => d.punches?.length > 0)
    console.log(`    → Dias: ${days.length}, com batidas: ${daysWithPunches.length}`)
    for (const d of daysWithPunches.slice(0, 3)) {
      console.log(`      ${d.date_raw} → ${d.punches.map((p: any) => `${p.kind}:${p.time_hhmm}`).join(', ')}`)
    }
    if (daysWithPunches.length > 3) console.log(`      ... e mais ${daysWithPunches.length - 3} dias`)
  } else {
    console.log(`    → Mês/Ano: ${p?.month}/${p?.year}, Fields: ${p?.fields?.length}, Bases: ${p?.bases?.length}`)
    for (const f of (p?.fields || []).slice(0, 3)) {
      console.log(`      ${f.code} ${f.label} = ${f.value}`)
    }
  }
}

async function main() {
  console.log('🚀 Teste de Extração End-to-End (com pdf-to-img + Tesseract)')
  console.log('='.repeat(70))

  const allFiles = fs.readdirSync(uploadsDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => ({ name: f, path: path.join(uploadsDir, f), size: fs.statSync(path.join(uploadsDir, f)).size }))
    .filter(f => f.size > 16)
    .sort((a, b) => a.size - b.size)

  // Pick 1 from each distinct size group
  const sizeGroups = new Map<number, typeof allFiles[0]>()
  for (const f of allFiles) {
    const key = Math.round(f.size / 1024)
    if (!sizeGroups.has(key)) sizeGroups.set(key, f)
  }

  const selected = Array.from(sizeGroups.values()).slice(0, 4)
  console.log(`\n📁 ${allFiles.length} PDFs reais, testando ${selected.length} representativos\n`)

  for (const file of selected) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`📄 ${file.name} (${(file.size / 1024).toFixed(0)} KB) — testando como cartao-ponto`)
    console.log('='.repeat(70))

    const rawPages = await extractTextFromPDF(file.path)
    console.log(`📝 ${rawPages.length} páginas`)

    // Test only page 1 as cartao-ponto
    if (rawPages.length > 0) {
      await testPage(file.path, rawPages[0] || '', 1, 'cartao-ponto')
    }
  }

  console.log(`\n\n${'='.repeat(70)}`)
  console.log('🏁 Teste concluído!')
  console.log('='.repeat(70))
}

main().catch(err => { console.error('❌ Erro:', err); process.exit(1) })
