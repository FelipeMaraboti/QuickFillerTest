import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { transcricoesRoutes } from './routes/transcricoes'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1
    }
  })

  app.addHook('onRequest', (request, reply, done) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (request.method === 'OPTIONS') {
      reply.send()
      return
    }
    done()
  })

  app.get('/healthz', async () => {
    return { status: 'ok' }
  })

  app.register(transcricoesRoutes, { prefix: '/api' })

  return app
}
