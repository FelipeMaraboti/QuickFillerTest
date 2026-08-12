// Test: pdf-to-img rendering + Tesseract OCR
import { pdf } from 'pdf-to-img'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const LANG_PATH = path.resolve(process.cwd())

async function main() {
  const filePath = path.join(__dirname, '..', 'uploads', 'cmspg40k10002p93709fau1md.pdf')
  
  console.log('📄 Converting PDF to images with pdf-to-img...')
  
  const document = await pdf(filePath, { scale: 3.0 })
  let pageNum = 0
  
  for await (const imageBuffer of document) {
    pageNum++
    if (pageNum > 2) break // Only test first 2 pages
    
    console.log(`\n--- Page ${pageNum} ---`)
    console.log(`  Raw image: ${(imageBuffer.length / 1024).toFixed(0)} KB`)
    
    // Save raw image for inspection
    const rawPath = path.join(__dirname, `page_${pageNum}_raw.png`)
    fs.writeFileSync(rawPath, imageBuffer)
    
    // Get metadata
    const meta = await sharp(imageBuffer).metadata()
    console.log(`  Dimensions: ${meta.width}x${meta.height}`)
    
    // Pre-process for OCR
    const processedBuffer = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(140)
      .png()
      .toBuffer()
    
    console.log(`  Processed image: ${(processedBuffer.length / 1024).toFixed(0)} KB`)
    
    const processedPath = path.join(__dirname, `page_${pageNum}_processed.png`)
    fs.writeFileSync(processedPath, processedBuffer)
    
    // Run OCR
    console.log('  Running Tesseract OCR (lang: por)...')
    const { data: { text, confidence } } = await Tesseract.recognize(processedBuffer, 'por', {
      langPath: LANG_PATH,
    })
    
    console.log(`  OCR confidence: ${confidence}%`)
    console.log(`  OCR text length: ${text.length} chars`)
    console.log(`  OCR preview (first 500 chars):`)
    console.log('  ─'.repeat(40))
    console.log(text.substring(0, 500))
    console.log('  ─'.repeat(40))
  }
  
  console.log('\n✅ Done!')
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
