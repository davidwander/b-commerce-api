import { FastifyInstance } from 'fastify';
import SaleController from '../controllers/SaleController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
}

async function salesRoutes(fastify: FastifyInstance) {
  const saleController = new SaleController();
  const authMiddleware = new AuthMiddleware();

  // Rota de teste SEM autenticação para debug
  fastify.post('/test', async (request, reply) => {
    console.log('🧪 === TESTE DE ROTA DE VENDAS SEM AUTH ===');
    console.log('📦 Body recebido:', request.body);
    console.log('📋 Headers:', request.headers);
    
    reply.send({
      success: true,
      message: 'Rota de vendas está funcionando!',
      data: {
        receivedBody: request.body,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Rota principal COM autenticação (com debug adicional)
  fastify.post('/', { 
    preHandler: async (request, reply) => {
      console.log('🔐 === INICIANDO AUTH MIDDLEWARE PARA VENDAS ===');
      try {
        await authMiddleware.authenticate(request, reply);
        console.log('✅ AUTH MIDDLEWARE VENDAS: Sucesso');
        console.log('👤 User ID definido:', (request as any).userId);
      } catch (error) {
        console.error('❌ AUTH MIDDLEWARE VENDAS: Erro:', error);
        throw error;
      }
    }
  }, async (request, reply) => {
    console.log('🏪 === CHEGOU NO CONTROLLER DE VENDAS ===');
    console.log('👤 User ID no controller:', (request as any).userId);
    return saleController.createSale(request, reply);
  });

  // Rota para adicionar peças
  fastify.post('/:saleId/pieces', { preHandler: authMiddleware.authenticate }, async (request, reply) => {
    return saleController.addPieceToSale(request, reply);
  });
}

export default salesRoutes;