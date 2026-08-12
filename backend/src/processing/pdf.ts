import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export async function extractTextFromPDF(filePath: string): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ url: filePath, useSystemFonts: true })
  const pdfDocument = await loadingTask.promise

  const pagesText: string[] = []

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i)
    const textContent = await page.getTextContent()
    
    // Simplificando: juntamos os itens separando por espaço ou quebra de linha.
    // O layout complexo requer heurísticas avançadas de posição X/Y,
    // mas para esse desafio assumiremos que o Tesseract ou as coordenadas lineares bastam
    // onde possível, para simplificar. 
    // Em muitos casos, se extração bruta de PDF for ruim, o fallback OCR resolve melhor.
    
    // Ordenar itens do textContent pela coordenada Y (de cima pra baixo) e X (esquerda pra direita)
    const items = textContent.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5]
    }))

    // Ordenar por Y decrescente (o topo da página tem maior Y)
    // Se Y forem parecidos (mesma linha), ordenar por X crescente
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 5) {
        return b.y - a.y // Y maior vem antes
      }
      return a.x - b.x
    })

    let pageText = ''
    let currentY = items.length > 0 ? items[0].y : 0

    for (const item of items) {
      if (Math.abs(currentY - item.y) > 5) {
        pageText += '\n'
        currentY = item.y
      } else {
        pageText += ' '
      }
      pageText += item.str.trim()
    }

    pagesText.push(pageText)
  }

  return pagesText
}
