import fs from 'fs'
import pdfParse from 'pdf-parse'

export async function extractTextFromPDF(filePath: string): Promise<string[]> {
  try {
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    
    // Se o pdfParse retornar texto estruturado por páginas ou texto completo
    if (data && data.text) {
      return [data.text]
    }
    return ['']
  } catch (error) {
    console.error('Erro ao extrair texto com pdf-parse:', error)
    return ['']
  }
}
