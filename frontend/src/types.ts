export type AppState = 'uploading' | 'processing' | 'reviewing' | 'error'

export interface Progresso {
  paginaAtual: number
  totalPaginas: number
  etapa: string
  tempoEstimadoSegundos: number
}

export interface Transcricao {
  id: string
  status: string
  tipo: string
  progresso: Progresso | null
  value: any
}
