import fs from 'fs'
import pdfParse from 'pdf-parse'

function renderPageText(pageData: any) {
  return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent: any) => {
    let lastY: number | null = null
    let text = ''
    for (const item of textContent.items) {
      if (lastY === item.transform[5] || !lastY) {
        text += ' ' + item.str
      } else {
        text += '\n' + item.str
      }
      lastY = item.transform[5]
    }
    return text
  })
}

export async function extractTextFromPDF(filePath: string): Promise<string[]> {
  try {
    const pages: string[] = []
    const options = {
      pagerender: async function (pageData: any) {
        const pageText = await renderPageText(pageData)
        pages.push(pageText)
        return pageText
      }
    }

    const buffer = fs.readFileSync(filePath)
    await pdfParse(buffer, options)

    if (pages.length > 0) {
      return pages
    }
    return ['']
  } catch (error) {
    console.error('Erro ao extrair texto com pdf-parse por página:', error)
    return ['']
  }
}
