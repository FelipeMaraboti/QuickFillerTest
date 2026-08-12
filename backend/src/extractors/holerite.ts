export function extrairHolerite(textPages: string[]) {
  const result = { pages: [] as any[] }

  const monthMap: Record<string, string> = {
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARCO': '03', 'MARÇO': '03',
    'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07',
    'AGOSTO': '08', 'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
  }

  const moneyRegex = /([\d\?]{1,3}(?:\.[\d\?]{3})*,[\d\?]{2})/
  const dualMoneyRegex = /([\d\?]{1,3}(?:\.[\d\?]{3})*,[\d\?]{2})\s+([\d\?]{1,3}(?:\.[\d\?]{3})*,[\d\?]{2})/
  
  for (let i = 0; i < textPages.length; i++) {
    const pageText = textPages[i]
    const lines = pageText.split('\n')
    
    let year = ''
    let month = ''
    const fields: any[] = []
    const bases: any[] = []
    
    let inBasesSection = false

    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, ' ').trim()
      if (!cleanLine) continue

      // Extrair Competência (Mês/Ano)
      if (!year || !month) {
        const compMatch = cleanLine.match(/(?:Período|Referencia)\s*:\s*([\w\?]+)\/([\d\?]{4})/i)
        if (compMatch) {
          const m = compMatch[1].toUpperCase()
          year = compMatch[2]
          if (m.match(/^\d+$/)) {
            month = m.padStart(2, '0')
          } else {
            month = monthMap[m] || '??'
          }
        }
      }

      // Detecção de transição para a área de bases
      if (cleanLine.match(/Total(?!.*Proventos|.*Descontos)/i) || 
          cleanLine.match(/L[íi]q[uü]ido/i) || 
          cleanLine.match(/Base/i) && !cleanLine.match(/Sal[áa]rio Base/i)) {
        inBasesSection = true
      }

      // Se não tiver valor monetário, pula
      if (!cleanLine.match(moneyRegex)) continue

      // Heurística de extração
      // As linhas de verba e base têm textos descritivos e valores.
      // Pode haver código numérico no início da verba.
      // Vamos tentar capturar todos os valores da linha.
      
      const parts = cleanLine.split(/\s+/)
      const values: string[] = []
      const texts: string[] = []
      
      for (const part of parts) {
        if (part.match(/^[\d\?]{1,3}(?:\.[\d\?]{3})*,[\d\?]{2}$/)) {
          values.push(part)
        } else {
          texts.push(part)
        }
      }

      const isBase = inBasesSection || cleanLine.match(/Base I\.?N\.?S\.?S\.?/i) || cleanLine.match(/Base I\.?R\.?R\.?F\.?/i) || cleanLine.match(/FGTS|F\.G\.T\.S\./i) || cleanLine.match(/Total de Vencimentos/i)

      if (isBase) {
        // Se a linha tem múltiplos textos e valores, podemos associá-los (Ex: Base INSS: 1.000,00 FGTS: 80,00)
        // Isso é comum na seção de bases (Ex: Base I.N.S.S. : 1.967,07 F.G.T.S. do Mês : 157,37)
        // Vamos tentar usar um regex flexível
        const chunks = cleanLine.split(/(?=Base|F\.G\.T\.S\.|FGTS|Dep\.|Sal\.)/) // Dividir a linha se houver múltiplas bases
        
        for (const chunk of chunks) {
           const matchVal = chunk.match(moneyRegex)
           if (matchVal) {
             const val = matchVal[1]
             const lbl = chunk.replace(val, '').replace(/[:.]/g, '').trim()
             if (lbl && val) {
               bases.push({ label: lbl, value: val })
             }
           }
        }
      } else {
        // É uma verba
        // Formatos: [Código] [Descrição] [Ref] [Valor]
        // O código costuma ser o primeiro se for número
        let code = ''
        let label = ''
        let reference = ''
        let value = values[values.length - 1] // O último valor costuma ser o financeiro
        
        // Se houver 2 valores, o primeiro pode ser a referência (se não tiver vírgula, ou se for algo pequeno)
        if (values.length > 1) {
          reference = values[values.length - 2]
        }

        const textString = texts.join(' ')
        // Pega a primeira palavra como código se for numérico ou barra+número
        const firstWordMatch = textString.match(/^([\/\d\w]+)\s+(.*)/)
        
        if (firstWordMatch && firstWordMatch[1].match(/\d/)) {
           code = firstWordMatch[1]
           label = firstWordMatch[2]
        } else {
           label = textString
        }

        // Limpeza simples
        label = label.replace(/:$/, '').trim()

        if (label && !label.match(/TOTAL DE/i) && !label.match(/TOTAL/i)) {
          fields.push({
            code,
            label,
            reference,
            value
          })
        }
      }
    }

    result.pages.push({
      page: i + 1,
      year: year || '????',
      month: month || '??',
      fields,
      bases
    })
  }

  return result
}
