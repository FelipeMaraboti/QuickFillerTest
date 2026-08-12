export function extrairCartaoPonto(textPages: string[]) {
  const result = { pages: [] as any[] }

  for (let i = 0; i < textPages.length; i++) {
    const pageText = textPages[i]
    const lines = pageText.split('\n')
    const days: any[] = []
    
    let currentDay: any = null

    for (const line of lines) {
      // Remover espaços múltiplos e limpar
      const cleanLine = line.replace(/\s+/g, ' ').trim()
      if (!cleanLine) continue

      // Tentativa 1: Formato DD/MM/YYYY ou DD/MM/YY
      const matchDate = cleanLine.match(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})(.*)/)
      // Tentativa 2: Formato DD - DOW (Ex: 1 - DOM, 2 - SEG ou 01 SEG)
      const matchDay = cleanLine.match(/(\d{1,2}\s*[\-\s]\s*[A-Z]{3})(.*)/i)

      let remainingText = ''

      if (matchDate) {
        currentDay = {
          date_raw: matchDate[1],
          punches: []
        }
        days.push(currentDay)
        remainingText = matchDate[2].replace(/^\s*[A-Za-z]{3}\s*/, '')
      } else if (matchDay) {
        currentDay = {
          date_raw: matchDay[1],
          punches: []
        }
        days.push(currentDay)
        remainingText = matchDay[2]
      } else if (currentDay) {
        // Se a linha não começa com data, mas já temos um currentDay, os horários podem estar nesta linha
        // ex: 15:12 18:36 na linha de baixo
        // Temos que garantir que não é outra seção do documento.
        // Vamos considerar se a linha começar com horário ou tiver formato semelhante
        const isTimeLine = cleanLine.match(/^\d{2}:\d{2}/) || cleanLine.match(/^\d\?:\d{2}/) || cleanLine.match(/^\?\d:\d{2}/)
        if (isTimeLine) {
          remainingText = cleanLine
        }
      }

      if (currentDay && remainingText) {
        // Extrair horários do remainingText
        // Regex para buscar horários no formato 00:00, 0?:00, ??:?? e com sufixos opcionais como 'd' ou 'c'
        // \d|\? é usado para suportar o OCR com caracteres incertos
        const timeRegex = /([\d\?]{2}:[\d\?]{2}[a-zA-Z]?)/g
        let match
        let isFirstTimeMatch = true
        let lastMatchIndex = 0

        while ((match = timeRegex.exec(remainingText)) !== null) {
          const time_raw = match[1]

          // Se houver texto puro entre a última batida (ou o início) e esta batida, provavelmente entramos na seção "Ocorrencia"
          const textBetween = remainingText.slice(lastMatchIndex, match.index).trim()
          if (textBetween && textBetween.match(/[A-Za-z]{3,}/)) {
             // Tem palavras no meio, então as batidas acabaram
             break
          }
          lastMatchIndex = match.index + match[0].length
          
          // Ignorar jornada
          if (matchDay && isFirstTimeMatch && remainingText.trim().startsWith(time_raw)) {
             isFirstTimeMatch = false
             continue
          }
          isFirstTimeMatch = false

          // Normalizar para HH:MM
          const time_hhmm = time_raw.replace(/[a-zA-Z]+$/, '')
          
          currentDay.punches.push({
            kind: currentDay.punches.length % 2 === 0 ? 'IN' : 'OUT',
            time_raw,
            time_hhmm
          })
        }
      }
    }

    result.pages.push({
      page: i + 1,
      days
    })
  }

  return result
}
