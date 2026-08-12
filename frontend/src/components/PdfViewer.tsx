import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'

// Configura o worker do PDF.js via CDN estática compatível com react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  id: string
}

export default function PdfViewer({ id }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>()
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-slate-800 p-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <button 
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(p => p - 1)}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <span className="text-sm text-slate-300">
            {pageNumber} de {numPages || '?'}
          </span>
          <button 
            disabled={pageNumber >= (numPages || 1)}
            onClick={() => setPageNumber(p => p + 1)}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <ZoomOut className="w-5 h-5 text-slate-300" />
          </button>
          <span className="text-xs text-slate-400 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <ZoomIn className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-950">
        <Document
          file={`http://localhost:3333/api/transcricoes/${id}/arquivo`}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-slate-400 animate-pulse">Carregando PDF...</div>}
          error={<div className="text-red-400">Erro ao carregar o PDF.</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={true}
            renderAnnotationLayer={false}
            className="shadow-xl"
          />
        </Document>
      </div>
    </div>
  )
}
