export type AppState = 'uploading' | 'processing' | 'reviewing' | 'error'

export interface Transcricao {
  id: string
  status: string
  tipo: string
  value: any
}
