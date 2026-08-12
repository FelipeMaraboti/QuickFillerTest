import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Transcricao } from '../App'
import { FileSearch } from 'lucide-react'

interface ProcessingStatusProps {
  id: string
  onComplete: (data: Transcricao) => void
  onError: () => void
}

export default function ProcessingStatus({ id, onComplete, onError }: ProcessingStatusProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:3333/api/transcricoes/${id}`)
        if (!res.ok) throw new Error('Falha ao checar status')
        
        const data: Transcricao = await res.json()
        
        if (data.status === 'concluido') {
          onComplete(data)
        } else if (data.status === 'erro') {
          onError()
        }
      } catch (err) {
        console.error(err)
        // Retry will happen on next poll unless it completely crashes, but for now we just log
      }
    }

    const interval = setInterval(poll, 2000)
    poll() // Initial fetch

    return () => clearInterval(interval)
  }, [id, onComplete, onError])

  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <Card className="bg-slate-900 border-slate-800 text-slate-100 py-12">
        <CardContent className="flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <FileSearch className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Analisando Documento</h2>
          <p className="text-slate-400">
            Nossa IA está lendo e estruturando os dados{dots}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
