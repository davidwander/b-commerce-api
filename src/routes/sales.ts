import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import SaleController from '../controllers/SaleController.js';
import authenticateToken from '../middleware/authMiddleware.js';

// Interfaces para tipagem
interface CreateSaleBody {
  clientName: string;
  phone?: string;
  address?: string;
}

interface AddPieceToSaleParams {
  saleId: string;
}

interface AddPieceToSaleBody {
  pieceId: string;
  quantity: number;
}

interface GetSalesQuery {
  status?: 'open' | 'closed';
  page?: string;
  limit?: string;
}

interface GetSaleParams {
  saleId: string;
}

interface UpdateShippingValueParams {
  saleId: string;
}

interface UpdateShippingValueBody {
  shippingValue: number;
}

export default async function salesRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // INSTANCIAR O CONTROLLER
  const saleController = new SaleController();

  // Schema para validação de criação de venda
  const createSaleSchema = {
    body: {
      type: 'object',
      required: ['clientName'],
      properties: {
        clientName: {
          type: 'string',
          minLength: 1,
          maxLength: 255
        },
        phone: {
          type: 'string',
          maxLength: 20
        },
        address: {
          type: 'string',
          maxLength: 500
        }
      }
    }
  };

  // Schema para adicionar peça à venda
  const addPieceSchema = {
    params: {
      type: 'object',
      required: ['saleId'],
      properties: {
        saleId: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      required: ['pieceId', 'quantity'],
      properties: {
        pieceId: { type: 'string' },
        quantity: { type: 'number', minimum: 1 }
      }
    }
  };

  // Schema para atualizar valor do frete
  const updateShippingValueSchema = {
    params: {
      type: 'object',
      required: ['saleId'],
      properties: {
        saleId: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      required: ['shippingValue'],
      properties: {
        shippingValue: { type: 'number', minimum: 0 }
      }
    }
  };

  // ROTA: Criar nova venda (COM MIDDLEWARE DE AUTENTICAÇÃO)
  fastify.post<{ Body: CreateSaleBody }>('/', {
    schema: createSaleSchema,
    preHandler: [authenticateToken] // 🔥 ADICIONAR O MIDDLEWARE AQUI
  }, async (request: FastifyRequest<{ Body: CreateSaleBody }>, reply: FastifyReply) => {
    return saleController.createSale(request, reply);
  });

  // ROTA: Listar vendas do usuário (COM MIDDLEWARE DE AUTENTICAÇÃO)
  fastify.get<{ Querystring: GetSalesQuery }>('/', {
    preHandler: [authenticateToken] // 🔥 ADICIONAR O MIDDLEWARE AQUI
  }, async (request: FastifyRequest<{ Querystring: GetSalesQuery }>, reply: FastifyReply) => {
    return saleController.getSales(request, reply);
  });

  // ROTA: Buscar venda específica por ID (COM MIDDLEWARE DE AUTENTICAÇÃO)
  fastify.get<{ Params: GetSaleParams }>('/:saleId', {
    preHandler: [authenticateToken] // 🔥 ADICIONAR O MIDDLEWARE AQUI
  }, async (request: FastifyRequest<{ Params: GetSaleParams }>, reply: FastifyReply) => {
    return saleController.getSaleById(request, reply);
  });

  // ROTA: Adicionar peça à venda (COM MIDDLEWARE DE AUTENTICAÇÃO)
  fastify.post<{ Params: AddPieceToSaleParams; Body: AddPieceToSaleBody }>('/:saleId/pieces', {
    schema: addPieceSchema,
    preHandler: [authenticateToken] // 🔥 ADICIONAR O MIDDLEWARE AQUI
  }, async (request: FastifyRequest<{ Params: AddPieceToSaleParams; Body: AddPieceToSaleBody }>, reply: FastifyReply) => {
    return saleController.addPieceToSale(request, reply);
  });

  // ROTA: Confirmar pagamento de uma venda (COM MIDDLEWARE DE AUTENTICAÇÃO)
  fastify.patch<{ Params: GetSaleParams }>('/:saleId/confirm-payment', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Params: GetSaleParams }>, reply: FastifyReply) => {
    return saleController.confirmPayment(request, reply);
  });

  // ROTA: Atualizar valor do frete (COM MIDDLEWARE DE AUTENTICAÇÃO)
  fastify.patch<{ Params: UpdateShippingValueParams; Body: UpdateShippingValueBody }>('/:saleId/shipping-value', {
    schema: updateShippingValueSchema,
    preHandler: [authenticateToken],
  }, async (request: FastifyRequest<{ Params: UpdateShippingValueParams; Body: UpdateShippingValueBody }>, reply: FastifyReply) => {
    return saleController.updateShippingValue(request, reply);
  });

  // ROTA DE TESTE (opcional, sem autenticação para debug)
  fastify.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Rota de vendas funcionando!',
      timestamp: new Date().toISOString(),
      data: request.body
    });
  });
}