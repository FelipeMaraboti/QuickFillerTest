import { useState } from 'react'
import UploadForm from './components/UploadForm'
import ProcessingStatus from './components/ProcessingStatus'
import ReviewLayout from './components/ReviewLayout'
import type { AppState, Transcricao } from './types'

function App() {
  const [appState, setAppState] = useState<AppState>('uploading')
  const [transcricaoId, setTranscricaoId] = useState<string | null>(null)
  const [transcricaoData, setTranscricaoData] = useState<Transcricao | null>(null)

  const handleUploadSuccess = (id: string) => {
    setTranscricaoId(id)
    setAppState('processing')
  }

  const handleProcessingComplete = (data: Transcricao) => {
    setTranscricaoData(data)
    setAppState('reviewing')
  }

  const handleReset = () => {
    setTranscricaoId(null)
    setTranscricaoData(null)
    setAppState('uploading')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-lg">Q</div>
            <h1 className="text-xl font-bold tracking-tight">Quick Filler</h1>
          </div>
          {appState === 'reviewing' && (
            <button onClick={handleReset} className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
              Nova Extração
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4 flex-1 mt-8">
        {appState === 'uploading' && <UploadForm onSuccess={handleUploadSuccess} />}
        {appState === 'processing' && transcricaoId && (
           <ProcessingStatus 
              id={transcricaoId} 
              onComplete={handleProcessingComplete} 
              onError={() => setAppState('error')} 
           />
        )}
        {appState === 'reviewing' && transcricaoData && (
           <ReviewLayout data={transcricaoData} />
        )}
        {appState === 'error' && (
           <div className="text-center py-20">
             <h2 className="text-red-400 text-2xl font-bold mb-4">Erro no Processamento</h2>
             <p className="text-slate-400 mb-8">Ocorreu um erro ao extrair os dados do PDF.</p>
             <button 
               onClick={handleReset}
               className="bg-slate-800 px-6 py-2 rounded hover:bg-slate-700 transition"
             >
               Tentar Novamente
             </button>
           </div>
        )}
      </main>
    </div>
  )
}

export default App
