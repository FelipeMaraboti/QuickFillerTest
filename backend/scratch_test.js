const lines = [
  "Recibo de Pagamento",
  "Referencia             Folha",
  "SETEMBRO/2018          MENSAL",
  "10/2019",
  "abr-17",
  "Data Admissão: 09/09/2015",
  "Data Pagto: 31.10.2019",
  "Mês: abr-17"
]

// Our monthMap keys
const months = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const monthPattern = months.join('|')
const fallbackRegex = new RegExp(`^\\s*\\b(0?[1-9]|1[0-2]|${monthPattern})[\\/\\-](20\\d\\d|\\d{2})\\b`, 'i')

for (const line of lines) {
  const compMatch = line.match(/(?:Período|Referencia|M[êe]s(?:\/Ano)?)\s*[:]?\s*([\w\?]+)[\/\-]([\d\?]{2,4})/i)
  const match2 = line.match(fallbackRegex)
  console.log({ line, compMatch: compMatch ? compMatch[0] : null, fallbackMatch: match2 ? match2[0] : null })
}
