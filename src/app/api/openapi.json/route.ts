import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'SMSMoz API',
    version: '1.0.0',
    description:
      'API REST para envio de SMS em massa e transacionais em Moçambique. Autentique todos os pedidos com o cabeçalho `Authorization: Bearer <api_key>`.',
    contact: { name: 'Suporte SMSMoz', email: 'suporte@smsmoz.co.mz' },
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'API Key' },
    },
    schemas: {
      SendRequest: {
        type: 'object',
        required: ['to', 'message'],
        properties: {
          to: { type: 'string', example: '+258841234567' },
          message: { type: 'string', example: 'Olá! O seu código é 4321.' },
          sender_id: { type: 'string', maxLength: 11, example: 'SMSMoz' },
          flash: { type: 'boolean', default: false },
          scheduled_at: { type: 'string', format: 'date-time' },
        },
      },
      BulkSendRequest: {
        type: 'object',
        required: ['recipients', 'message'],
        properties: {
          recipients: { type: 'array', items: { type: 'string' }, example: ['+258841234567', '+258861234567'] },
          message: { type: 'string' },
          sender_id: { type: 'string', maxLength: 11 },
          flash: { type: 'boolean' },
          scheduled_at: { type: 'string', format: 'date-time' },
          batch_name: { type: 'string' },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          list_id: { type: 'string', format: 'uuid', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['phone'],
      },
      Error: {
        type: 'object',
        properties: { success: { type: 'boolean', example: false }, error: { type: 'string' } },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/send': {
      post: {
        summary: 'Enviar um SMS individual',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendRequest' } } } },
        responses: {
          '201': { description: 'SMS aceite/enviado' },
          '402': { description: 'Créditos insuficientes' },
          '422': { description: 'Dados inválidos' },
        },
      },
    },
    '/bulk-send': {
      post: {
        summary: 'Enviar SMS em massa',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BulkSendRequest' } } } },
        responses: { '201': { description: 'Lote aceite para processamento' } },
      },
    },
    '/balance': {
      get: { summary: 'Consultar saldo de créditos', responses: { '200': { description: 'Saldo actual' } } },
    },
    '/reports': {
      get: {
        summary: 'Histórico e relatórios de envio',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Lista paginada de mensagens' } },
      },
    },
    '/contacts': {
      get: {
        summary: 'Listar contactos',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { '200': { description: 'Lista paginada de contactos' } },
      },
      post: {
        summary: 'Criar contacto',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Contact' } } } },
        responses: { '201': { description: 'Contacto criado' } },
      },
    },
    '/contacts/{id}': {
      delete: {
        summary: 'Eliminar contacto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Contacto eliminado' } },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec)
}
