import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import AuthMiddleware from '../middleware/authMiddleware.js'; // 🔧 IMPORTAR SEU MIDDLEWARE

const prisma = new PrismaClient();

// ===========================
// ROTAS DA API
// ===========================

// Definindo o tipo para o corpo da requisição de criação de peça
interface CreatePieceBody {
  categoryPath: string[];
  description: string;
  quantity?: number;
}

export default async function inventoryRoutes(fastify: FastifyInstance) {
  const authMiddleware = new AuthMiddleware();

  // Rota para buscar todas as peças
  fastify.get('/pieces', { preHandler: authMiddleware.authenticate.bind(authMiddleware) }, async (request, reply) => {
    try {
      const userId = (request as any).userId; // Obter o ID do usuário autenticado
      const pieces = await prisma.piece.findMany({
        where: { userId },
        include: { category: true } // Incluir informações da categoria, se necessário
      });
      return reply.send({ success: true, data: pieces });
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar peças' });
    }
  });

  // 1. BUSCAR ÁRVORE COMPLETA DE CATEGORIAS COM PEÇAS DO USUÁRIO
  fastify.get('/categories/tree', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (_request: FastifyRequest, _reply: FastifyReply) => {
    // ... lógica para buscar árvore de categorias ...
  });

  // 2. ADICIONAR NOVA PEÇA
  fastify.post<{ Body: CreatePieceBody }>('/pieces', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware),
    schema: {
      body: {
        type: 'object',
        required: ['categoryPath', 'description'],
        properties: {
          categoryPath: { 
            type: 'array', 
            items: { type: 'string' },
            minItems: 1
          },
          description: { type: 'string', minLength: 1 },
          quantity: { type: 'number', minimum: 1, default: 1 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreatePieceBody }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId; // Obter o ID do usuário autenticado
      const { categoryPath, description, quantity = 1 } = request.body;

      // Validar se as categorias existem
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryPath[0] }
      });

      if (!categoryExists) {
        return reply.status(400).send({
          success: false,
          error: 'Categoria não encontrada'
        });
      }

      // Determinar IDs das categorias
      const categoryId = categoryPath[0];
      const subcategoryId = categoryPath[1] || null;
      const genderId = categoryPath[2] || null;

      // Criar a peça
      const piece = await prisma.piece.create({
        data: {
          description,
          categoryId,
          subcategoryId,
          genderId,
          categoryPath: categoryPath.join('/'),
          quantity,
          userId
        }
      });

      return reply.send({
        success: true,
        data: {
          id: piece.id,
          description: piece.description,
          quantity: piece.quantity
        }
      });

    } catch (error) {
      console.error('Erro ao criar peça:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao adicionar peça'
      });
    }
  });
}