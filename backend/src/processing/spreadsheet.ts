import ExcelJS from 'exceljs'
import { prisma } from '../database/prisma'

export async function gerarPlanilha(id: string, formato: string): Promise<Buffer | string | any> {
  const transcricao = await prisma.transcricao.findUnique({ where: { id } })
  if (!transcricao || !transcricao.value) {
    throw new Error('Transcrição não encontrada ou sem dados')
  }

  const value = JSON.parse(transcricao.value)
  const isCartao = transcricao.tipo === 'cartao-ponto'

  if (formato === 'json') {
    return JSON.stringify(value, null, 2)
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Dados')

  // Configuração do cabeçalho
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: 'FF173772' } }
  }

  if (isCartao) {
    // Achar o dia com mais batidas
    let maxPunches = 0
    for (const page of value.pages) {
      for (const day of page.days) {
        if (day.punches.length > maxPunches) maxPunches = day.punches.length
      }
    }

    const columns: any[] = [{ header: 'Data', key: 'data', width: 15 }]
    for (let i = 0; i < maxPunches / 2; i++) {
      columns.push({ header: `Entrada ${i + 1}`, key: `in_${i}`, width: 12 })
      columns.push({ header: `Saída ${i + 1}`, key: `out_${i}`, width: 12 })
    }
    sheet.columns = columns
    
    // Aplicar estilo no cabeçalho
    sheet.getRow(1).eachCell((cell) => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
    })

    // Adicionar linhas
    for (const page of value.pages) {
      for (const day of page.days) {
        const rowData: any = { data: day.date_raw }
        
        let hasWarning = false
        let hasError = false
        
        // Regras de negócio
        if (day.punches.length % 2 !== 0) hasWarning = true
        if (day.date_raw.includes('?')) hasWarning = true

        let inIndex = 0
        let outIndex = 0
        
        for (const p of day.punches) {
          if (p.time_raw.includes('?')) hasWarning = true
          
          if (p.kind === 'IN') {
            rowData[`in_${inIndex}`] = p.time_hhmm
            inIndex++
          } else {
            rowData[`out_${outIndex}`] = p.time_hhmm
            outIndex++
          }
        }

        const row = sheet.addRow(rowData)

        // Aplicar cores
        if (hasError) {
          row.eachCell((cell) => cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } })
          row.getCell(1).border = { left: { style: 'thick', color: { argb: 'FFDC3545' } } }
        } else if (hasWarning) {
          row.eachCell((cell) => cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } })
        }
      }
    }
  } else {
    // Holerite
    // Obter todas as verbas distintas na ordem de primeira aparição
    const allLabels = new Set<string>()
    for (const page of value.pages) {
      for (const field of page.fields) {
        allLabels.add(field.label)
      }
    }
    
    const labelsArray = Array.from(allLabels)
    const columns: any[] = [
      { header: 'Pág.', key: 'pag', width: 10 },
      { header: 'Mês', key: 'mes', width: 10 },
      { header: 'Ano', key: 'ano', width: 10 }
    ]

    for (const label of labelsArray) {
      columns.push({ header: label, key: label, width: 20 })
    }

    sheet.columns = columns

    // Aplicar estilo no cabeçalho
    sheet.getRow(1).eachCell((cell) => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
    })

    for (const page of value.pages) {
      const rowData: any = {
        pag: page.page,
        mes: page.month,
        ano: page.year
      }

      let hasWarning = page.fields.length === 0 && page.bases.length === 0 // página vazia
      if (page.month === '??' || page.year === '????') hasWarning = true

      for (const field of page.fields) {
        if (field.value.includes('?')) hasWarning = true
        rowData[field.label] = field.value
      }

      const row = sheet.addRow(rowData)
      if (hasWarning) {
         row.eachCell((cell) => cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } })
      }
    }
  }

  if (formato === 'csv') {
    const buffer = await workbook.csv.writeBuffer()
    return buffer
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}
