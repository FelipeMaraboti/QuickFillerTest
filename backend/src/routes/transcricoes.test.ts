import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

process.env.DATABASE_URL = 'file:./dev.db'

import request from 'supertest'
import { buildApp } from '../app'
import { prisma } from '../database/prisma'
import { FastifyInstance } from 'fastify'

vi.mock('../processing/processar', () => ({
  processarPDF: vi.fn().mockResolvedValue(true)
}))

describe('API Transcrições', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    
    // Limpar o banco antes dos testes
    await prisma.transcricao.deleteMany()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /healthz deve retornar status ok', async () => {
    const response = await request(app.server).get('/healthz')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('POST /api/transcricoes deve falhar sem arquivo', async () => {
    const response = await request(app.server).post('/api/transcricoes')
    expect(response.status).toBeGreaterThanOrEqual(400) // erro de cliente ou multipart
  })

  let transcricaoId = ''

  it('POST /api/transcricoes deve aceitar arquivo e tipo', async () => {
    // Simular o envio multipart
    const buffer = Buffer.from('Mock PDF content')
    
    const response = await request(app.server)
      .post('/api/transcricoes')
      .field('tipo', 'cartao-ponto')
      .attach('arquivo', buffer, 'teste.pdf')

    expect(response.status).toBe(202)
    expect(response.body).toHaveProperty('id')
    transcricaoId = response.body.id
  })

  it('GET /api/transcricoes/:id deve retornar o status', async () => {
    const response = await request(app.server).get(`/api/transcricoes/${transcricaoId}`)
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('id', transcricaoId)
    // Pode estar 'processando' ou já 'erro'/'concluido' pois o async executa em background, 
    // mas o contrato HTTP deve ser mantido
    expect(['processando', 'concluido', 'erro']).toContain(response.body.status)
  })

  it('PUT /api/transcricoes/:id deve atualizar o value', async () => {
    const novoValor = { pages: [] }
    const response = await request(app.server)
      .put(`/api/transcricoes/${transcricaoId}`)
      .send({ value: novoValor })

    expect(response.status).toBe(200)

    const check = await request(app.server).get(`/api/transcricoes/${transcricaoId}`)
    expect(check.body.value).toEqual(novoValor)
  })
})
