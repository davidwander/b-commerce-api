import { FastifyInstance } from 'fastify';
import SaleController from '../controllers/SaleController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: number;
    userEmail?: string;
  }
}

async function salesRoutes(fastify: FastifyInstance) {
  const saleController = new SaleController();
  const authMiddleware = new AuthMiddleware();

  // Rota para criar uma nova venda (protegida por autenticação)
  fastify.post('/sales', { preHandler: authMiddleware.authenticate }, async (request, reply) => {
    return saleController.createSale(request, reply);
  });

  // Rota para adicionar uma peça a uma venda existente (protegida por autenticação)
  fastify.post('/sales/:saleId/pieces', { preHandler: authMiddleware.authenticate }, async (request, reply) => {
    return saleController.addPieceToSale(request, reply);
  });
}

export default salesRoutes;
