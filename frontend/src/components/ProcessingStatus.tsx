import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Transcricao, Progresso } from '../types'
import { FileSearch, Clock, Loader2 } from 'lucide-react'

interface ProcessingStatusProps {
  id: string
  onComplete: (data: Transcricao) => void
  onError: () => void
}

function formatTempo(segundos: number): string {
  if (segundos < 0) return 'calculando...'
  if (segundos === 0) return 'finalizando...'
  if (segundos < 60) return `~${segundos}s`
  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  if (sec === 0) return `~${min}min`
  return `~${min}min ${sec}s`
}

export default function ProcessingStatus({ id, onComplete, onError }: ProcessingStatusProps) {
  const [dots, setDots] = useState('')
  const [progresso, setProgresso] = useState<Progresso | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Poll for status
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:3333/api/transcricoes/${id}`)
        if (!res.ok) throw new Error('Falha ao checar status')
        
        const data: Transcricao = await res.json()

        if (data.progresso) {
          setProgresso(data.progresso)
        }
        
        if (data.status === 'concluido') {
          onComplete(data)
        } else if (data.status === 'erro') {
          onError()
        }
      } catch (err) {
        console.error(err)
      }
    }

    const interval = setInterval(poll, 1500)
    poll()

    return () => clearInterval(interval)
  }, [id, onComplete, onError])

  const porcentagem = progresso && progresso.totalPaginas > 0
    ? Math.round((progresso.paginaAtual / progresso.totalPaginas) * 100)
    : 0

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}m${sec.toString().padStart(2, '0')}s`
  }

  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <Card className="bg-slate-900 border-slate-800 text-slate-100 py-10">
        <CardContent className="flex flex-col items-center px-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Analisando Documento</h2>

          {/* Etapa atual */}
          <p className="text-slate-400 mb-6 min-h-[1.5em]">
            {progresso?.etapa || `Nossa IA está lendo e estruturando os dados${dots}`}
          </p>

          {/* Barra de progresso */}
          {progresso && progresso.totalPaginas > 0 && (
            <div className="w-full mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Página {progresso.paginaAtual} de {progresso.totalPaginas}</span>
                <span>{porcentagem}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-2.5 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(porcentagem, 2)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tempo estimado e decorrido */}
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Decorrido: {formatElapsed(elapsed)}</span>
            </div>
            {progresso && progresso.tempoEstimadoSegundos >= 0 && (
              <div className="flex items-center gap-1">
                <FileSearch className="w-3 h-3" />
                <span>Restante: {formatTempo(progresso.tempoEstimadoSegundos)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
