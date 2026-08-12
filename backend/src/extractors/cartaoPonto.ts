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
      const matchDate = cleanLine.match(/^(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})(.*)/)
      // Tentativa 2: Formato DD DOW ou DD - DOW (Ex: 01 SAB, 02 DOM, 1 - DOM, 2 - SEG, 17 SEG)
      const matchDay = cleanLine.match(/^(\d{1,2})\s*[\-\s]?\s*([A-Za-z]{3})\b(.*)/i)
      // Tentativa 3: Formato Quinzena/Número de dia isolado no início da linha (Ex: "1 09:50 14:15", "17 09:32 14:23")
      const matchQuinzenaDay = cleanLine.match(/^(\d{1,2})\s+([\+\d\?:]{4,}.*)/)
      // Tentativa 4: Formato linha começando direto pela sigla do dia da semana (Ex: "SEG 07:00d 12:00d", "TER ABONO JORNADA")
      const matchPureDow = cleanLine.match(/^(SEG|TER|QUA|QUI|SEX|SAB|DOM)\b(.*)/i)

      let remainingText = ''
      let isDayMatch = false

      if (matchDate) {
        currentDay = {
          date_raw: matchDate[1],
          punches: []
        }
        days.push(currentDay)
        remainingText = matchDate[2].replace(/^\s*[A-Za-z]{3}\s*/, '')
      } else if (matchDay) {
        currentDay = {
          date_raw: `${matchDay[1]} - ${matchDay[2].toUpperCase()}`,
          punches: []
        }
        days.push(currentDay)
        remainingText = matchDay[3]
        isDayMatch = true
      } else if (matchQuinzenaDay && parseInt(matchQuinzenaDay[1]) >= 1 && parseInt(matchQuinzenaDay[1]) <= 31) {
        currentDay = {
          date_raw: `Dia ${matchQuinzenaDay[1]}`,
          punches: []
        }
        days.push(currentDay)
        remainingText = matchQuinzenaDay[2]
      } else if (matchPureDow) {
        currentDay = {
          date_raw: matchPureDow[1].toUpperCase(),
          punches: []
        }
        days.push(currentDay)
        remainingText = matchPureDow[2]
      } else if (currentDay) {
        // Se a linha não começa com data, mas já temos um currentDay, os horários podem estar nesta linha
        const isTimeLine = cleanLine.match(/^[\+\s]*[\d\?]{2}:[\d\?]{2}/)
        if (isTimeLine) {
          remainingText = cleanLine
        }
      }

      if (currentDay && remainingText) {
        // Extrair horários do remainingText (tolerante a OCR com :, . ou ,)
        const timeRegex = /([\+]?[\d\?]{1,2}[:\.,][\d\?]{2}[a-zA-Z]?)/g
        let match
        let isFirstTimeMatch = true
        let lastMatchIndex = 0

        while ((match = timeRegex.exec(remainingText)) !== null) {
          const time_raw = match[1]

          // Se houver texto puro entre a última batida (ou o início) e esta batida, ignorar se for apenas hífen de intervalo (ex: 12:00 - 18:15)
          const textBetween = remainingText.slice(lastMatchIndex, match.index).trim()
          if (textBetween && textBetween !== '-' && textBetween.match(/[A-Za-z]{3,}/)) {
             // Tem palavras de ocorrência no meio (ex: HE-BCO DE HORAS), então as batidas acabaram
             break
          }
          lastMatchIndex = match.index + match[0].length
          
          // Ignorar carga horária de jornada (se for o primeiro item do dia e for a jornada cadastrada no cabeçalho do dia como 2 - SEG 08:00 09:03 ...)
          if (matchDay && isFirstTimeMatch) {
             isFirstTimeMatch = false
             continue
          }
          isFirstTimeMatch = false

          // Normalizar para HH:MM (substituindo . ou , por :, removendo o + inicial e sufixos de letras como d/c)
          const time_hhmm = time_raw.replace(/^[\+]/, '').replace(/[a-zA-Z]+$/, '').replace(/[\.,]/, ':')
          
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
