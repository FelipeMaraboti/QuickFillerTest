import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import { transcricoesRoutes } from './routes/transcricoes'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })

  app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1
    }
  })

  app.get('/healthz', async () => {
    return { status: 'ok' }
  })

  app.register(transcricoesRoutes, { prefix: '/api' })

  return app
}
