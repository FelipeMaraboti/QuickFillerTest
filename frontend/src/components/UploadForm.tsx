import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUp, FileText, Upload } from 'lucide-react'

interface UploadFormProps {
  onSuccess: (id: string) => void
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [tipo, setTipo] = useState<'cartao-ponto' | 'holerite' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo PDF.')
      return
    }
    if (!tipo) {
      setError('Por favor, selecione o tipo do documento.')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('arquivo', file)
    formData.append('tipo', tipo)

    try {
      const response = await fetch('http://localhost:3333/api/transcricoes', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar arquivo.')
      }

      const data = await response.json()
      onSuccess(data.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-2xl">Transcrever Documento</CardTitle>
          <CardDescription className="text-slate-400">
            Envie um cartão de ponto ou holerite em PDF para extração inteligente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
              ${file ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}`}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex flex-col items-center text-blue-400">
                <FileText className="w-12 h-12 mb-3" />
                <span className="font-medium text-lg">{file.name}</span>
                <span className="text-sm opacity-70 mt-1">Clique para trocar</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <FileUp className="w-12 h-12 mb-3 text-slate-500" />
                <span className="font-medium text-lg">Selecione um PDF ou arraste aqui</span>
                <span className="text-sm opacity-70 mt-1">Até 20MB</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => setTipo('cartao-ponto')}
              className={`p-4 rounded-lg border cursor-pointer transition-colors text-center
                ${tipo === 'cartao-ponto' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-slate-700 hover:border-slate-600'}`}
            >
              <div className="font-semibold">Cartão de Ponto</div>
            </div>
            <div 
              onClick={() => setTipo('holerite')}
              className={`p-4 rounded-lg border cursor-pointer transition-colors text-center
                ${tipo === 'holerite' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-slate-700 hover:border-slate-600'}`}
            >
              <div className="font-semibold">Holerite</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm text-center">
              {error}
            </div>
          )}

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            onClick={handleUpload}
            disabled={!file || !tipo || loading}
          >
            {loading ? 'Enviando...' : (
               <>
                 <Upload className="w-5 h-5 mr-2" />
                 Iniciar Processamento
               </>
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}
