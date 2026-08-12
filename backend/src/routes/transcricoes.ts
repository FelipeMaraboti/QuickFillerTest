import { FastifyInstance } from 'fastify'
import { prisma } from '../database/prisma'
import { processarPDF } from '../processing/processar'
import fs from 'fs/promises'
import path from 'path'

export async function transcricoesRoutes(server: FastifyInstance) {
  server.post('/transcricoes', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })
    }

    const fileBuffer = await data.toBuffer()
    const fields = data.fields
    
    // Na API de multipart do fastify, os text fields vêm como objetos complexos, precisamos pegar o .value
    const tipoField = fields['tipo'] as any
    const tipo = tipoField ? tipoField.value : null

    if (!tipo || (tipo !== 'cartao-ponto' && tipo !== 'holerite')) {
      return reply.status(400).send({ error: 'Tipo inválido. Escolha cartao-ponto ou holerite.' })
    }

    // Criar o registro no banco
    const transcricao = await prisma.transcricao.create({
      data: {
        tipo,
        status: 'processando',
        filePath: '', // Atualizaremos logo abaixo
      }
    })

    const fileName = `${transcricao.id}.pdf`
    const filePath = path.join(process.cwd(), 'uploads', fileName)
    
    await fs.writeFile(filePath, fileBuffer)

    await prisma.transcricao.update({
      where: { id: transcricao.id },
      data: { filePath }
    })

    // Iniciar o processamento assíncrono sem await para não travar a request
    processarPDF(transcricao.id, filePath, tipo).catch(console.error)

    reply.status(202).send({ id: transcricao.id })
  })

  server.get('/transcricoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const transcricao = await prisma.transcricao.findUnique({ where: { id } })
    
    if (!transcricao) {
      return reply.status(404).send({ error: 'Transcrição não encontrada.' })
    }

    reply.send({
      id: transcricao.id,
      tipo: transcricao.tipo,
      status: transcricao.status,
      erro: transcricao.erro,
      value: transcricao.value ? JSON.parse(transcricao.value) : null
    })
  })

  server.get('/transcricoes/:id/arquivo', async (request, reply) => {
    const { id } = request.params as { id: string }
    const transcricao = await prisma.transcricao.findUnique({ where: { id } })
    
    if (!transcricao || !transcricao.filePath) {
      return reply.status(404).send({ error: 'Arquivo não encontrado.' })
    }

    const buffer = await fs.readFile(transcricao.filePath)
    reply.type('application/pdf').send(buffer)
  })

  server.put('/transcricoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { value } = request.body as { value: any }

    if (!value) {
      return reply.status(400).send({ error: 'Value é obrigatório.' })
    }

    const transcricao = await prisma.transcricao.findUnique({ where: { id } })
    if (!transcricao) {
      return reply.status(404).send({ error: 'Transcrição não encontrada.' })
    }

    await prisma.transcricao.update({
      where: { id },
      data: { value: JSON.stringify(value) }
    })

    reply.send({ status: 'ok' })
  })

  server.get('/transcricoes/:id/planilha', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { formato } = request.query as { formato?: string }
    
    const fmt = formato || 'xlsx'

    try {
      const { gerarPlanilha } = await import('../processing/spreadsheet')
      const result = await gerarPlanilha(id, fmt)

      if (fmt === 'json') {
        reply.type('application/json').send(result)
      } else if (fmt === 'csv') {
        reply.type('text/csv')
             .header('Content-Disposition', `attachment; filename="planilha_${id}.csv"`)
             .send(result)
      } else {
        reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
             .header('Content-Disposition', `attachment; filename="planilha_${id}.xlsx"`)
             .send(result)
      }
    } catch (err: any) {
      reply.status(500).send({ error: err.message })
    }
  })
}
