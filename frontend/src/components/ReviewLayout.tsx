import { useState } from 'react'
import { Transcricao } from '../App'
import PdfViewer from './PdfViewer'
import CartaoPontoTable from './CartaoPontoTable'
import HoleriteTable from './HoleriteTable'
import { Button } from '@/components/ui/button'
import { Save, Download, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ReviewLayoutProps {
  data: Transcricao
}

export default function ReviewLayout({ data: initialData }: ReviewLayoutProps) {
  const [data, setData] = useState<Transcricao>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDataChange = (newValue: any) => {
    setData(prev => ({ ...prev, value: newValue }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`http://localhost:3333/api/transcricoes/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.value)
      })
      if (!res.ok) throw new Error('Falha ao salvar')
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar as alterações.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    // First save the current state
    await handleSave()
    
    try {
      window.location.href = `http://localhost:3333/api/transcricoes/${data.id}/download`
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Revisão de Dados</h2>
          <p className="text-sm text-slate-400">
             Corrija qualquer campo necessário e baixe a planilha final.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleDownload}
            disabled={isDownloading || isSaving}
          >
            {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Baixar Planilha
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Lado Esquerdo: PDF Viewer */}
        <div className="w-1/2 flex flex-col min-h-0">
          <PdfViewer id={data.id} />
        </div>

        {/* Lado Direito: Tabelas */}
        <div className="w-1/2 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center mb-4 text-slate-300 space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-lg capitalize">{data.tipo.replace('-', ' ')}</h3>
          </div>
          
          <div className="flex-1 overflow-auto">
            {data.tipo === 'cartao-ponto' ? (
              <CartaoPontoTable data={data.value} onChange={handleDataChange} />
            ) : (
              <HoleriteTable data={data.value} onChange={handleDataChange} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
