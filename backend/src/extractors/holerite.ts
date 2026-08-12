export function extrairHolerite(textPages: string[]) {
  const result = { pages: [] as any[] }

  const monthMap: Record<string, string> = {
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARCO': '03', 'MARÇO': '03',
    'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07',
    'AGOSTO': '08', 'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12',
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  }

  const moneyRegex = /(-?[\d\?]+(?:[.,][\d\?]{3})*[.,][\d\?]{2}-?)(?!\.?\d)/
  const dualMoneyRegex = /(-?[\d\?]+(?:[.,][\d\?]{3})*[.,][\d\?]{2}-?)(?!\.?\d)\s+(-?[\d\?]+(?:[.,][\d\?]{3})*[.,][\d\?]{2}-?)(?!\.?\d)/
  
  for (let i = 0; i < textPages.length; i++) {
    const pageText = textPages[i]
    const lines = pageText.split('\n')
    
    let year = ''
    let month = ''
    let paymentDate = ''
    let paymentType = ''
    let fields: any[] = []
    let bases: any[] = []
    
    const commitPage = () => {
      if (fields.length > 0 || bases.length > 0) {
        result.pages.push({
          page: result.pages.length + 1,
          year: year || '????',
          month: month || '??',
          paymentDate,
          paymentType,
          fields,
          bases
        })
      }
      fields = []
      bases = []
    }

    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, ' ').trim()
      if (!cleanLine) continue

      // Extrair Competência (Mês/Ano) e detectar início de novo holerite
      let mMatch = ''
      let yMatch = ''
      
      const compMatch = cleanLine.match(/(?:Período|Referencia|M[êe]s(?:\/Ano)?)\s*[:]?\s*([\w\?]+)[\/\-]([\d\?]{2,4})/i)
      if (compMatch) {
        mMatch = compMatch[1]
        yMatch = compMatch[2]
      } else {
        const monthPattern = Object.keys(monthMap).join('|')
        const fallbackRegex = new RegExp(`^\\s*\\b(0?[1-9]|1[0-2]|${monthPattern})[\\/\\-](20\\d\\d|\\d{2})\\b`, 'i')
        const match2 = cleanLine.match(fallbackRegex)
        if (match2) {
          mMatch = match2[1]
          yMatch = match2[2]
        }
      }

      if (mMatch && yMatch) {
        // Se já temos dados, salva a página anterior e começa uma nova
        commitPage()
        
        const m = mMatch.toUpperCase()
        year = yMatch
        if (year.length === 2) {
          year = '20' + year // assuming 2000s for two digit years like '17'
        }
        if (m.match(/^\d+$/)) {
          month = m.padStart(2, '0')
        } else {
          month = monthMap[m] || '??'
        }
      }

      // Extrair Data Pagto e Tipo de Folha
      const dataPagtoMatch = cleanLine.match(/Data\s*Pagto\s*[:]?\s*([\d\.\/]+)/i) || cleanLine.match(/Pagamento\s*[:]?\s*([\d\.\/]+)/i)
      if (dataPagtoMatch && !paymentDate) {
        paymentDate = dataPagtoMatch[1]
      }

      const folhaMatch = cleanLine.match(/Folha de Pagamento\s*[:]?\s*([^\s]+)/i) || cleanLine.match(/Recibo de Pagamento.*?([a-zA-Z]+)\s*$/i)
      if (folhaMatch && !paymentType) {
        paymentType = folhaMatch[1]
      }

      // A detecção de bases agora é feita token por token (isItemBase)
      // para suportar holerites multi-colunas sem falsos positivos.      // Se não tiver valor monetário, pula
      if (!cleanLine.match(moneyRegex)) continue

      // Heurística de extração
      // As linhas de verba e base têm textos descritivos e valores.
      // Em alguns layouts, bases e verbas ficam na mesma linha (ex: VENCIMENTOS | DESCONTOS | BASES).
      // Vamos dividir a linha em tokens de (Texto -> Valores) e processar cada um individualmente.
      
      const tokens = cleanLine.split(moneyRegex)
      let currentLabel = ""
      let currentValues: string[] = []
      const items: { label: string, values: string[] }[] = []

      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j].trim()
        if (!token && !tokens[j].match(moneyRegex)) continue

        if (token.match(/^-?[\d\?]+(?:[.,][\d\?]{3})*[.,][\d\?]{2}-?(?!\.?\d)$/)) {
          currentValues.push(token)
        } else {
          if (currentValues.length > 0) {
            if (currentLabel || currentValues.length > 0) {
               items.push({ label: currentLabel.trim(), values: currentValues })
            }
            currentLabel = token
            currentValues = []
          } else {
            currentLabel = currentLabel ? currentLabel + " " + token : token
          }
        }
      }
      if (currentLabel || currentValues.length > 0) {
        items.push({ label: currentLabel.trim(), values: currentValues })
      }

      // Agora processamos cada item (que é um conjunto de Label + Valores numéricos)
      for (const item of items) {
        if (!item.values || item.values.length === 0) continue

        // Detecção se o item atual é uma Base/Totalizador
        const isItemBase = item.label.match(/Base/i) || 
                           item.label.match(/FGTS|F\.G\.T\.S\./i) || 
                           item.label.match(/(?:Total|Otal|L[íi]q[uü]ido)/i)
        
        if (isItemBase) {
          let baseLabel = item.label
          // Auto-corrigir erros comuns do OCR como "OTAL" no lugar de "TOTAL"
          if (baseLabel.match(/\bOtal\b/i)) {
             baseLabel = baseLabel.replace(/\bOtal\b/ig, 'TOTAL')
          }
          bases.push({ label: baseLabel, value: item.values[item.values.length - 1] })
        } else {
          // É uma verba
          let code = ''
          let label = ''
          let reference = ''
          let value = item.values[item.values.length - 1] // O último valor costuma ser o financeiro
          
          if (item.values.length > 1) {
            reference = item.values[item.values.length - 2]
          }

          // Pega a primeira palavra como código se for numérico ou barra+número
          const firstWordMatch = item.label.match(/^([\/\d\w]+)\s+(.*)/)
          
          if (firstWordMatch && firstWordMatch[1].match(/\d/)) {
             code = firstWordMatch[1]
             label = firstWordMatch[2]
          } else {
             label = item.label
          }

          label = label.replace(/:$/, '').trim()

          // Ignorar cabeçalhos falsos (sujeiras comuns de layout)
          if (label.match(/^(?:Margem|Sal[áa]rio Base|Sal[áa]rio Hora|Centro Custo|Banco)/i)) {
             continue
          }

          if (label && !label.match(/TOTAL DE/i) && !label.match(/TOTAL/i)) {
            const discountKeywords = ['INSS', 'IRRF', 'IMPOSTO', 'CONTR', 'VALE', 'FALTA', 'ATRASO', 'DESCONTO', 'ADIANTAMENTO', 'MENSALIDADE', 'PENSAO', 'PENSÃO', 'ASSISTENCIA', 'ASSISTÊNCIA', 'PLANO', 'SEGURO']
            const isDescontoKeyword = discountKeywords.some(k => label.toUpperCase().includes(k))
            
            const isDesconto = value.includes('-') || isDescontoKeyword
            const cleanValue = value.replace(/-/g, '')
            
            fields.push({
              code,
              description: label,
              reference,
              proventos: isDesconto ? '' : cleanValue,
              descontos: isDesconto ? cleanValue : ''
            })
          }
        }
      }
    }

    commitPage()
  }

  return result
}
