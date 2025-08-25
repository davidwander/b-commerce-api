import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import AuthMiddleware from '../middleware/authMiddleware.js'; // 🔧 IMPORTAR SEU MIDDLEWARE

const prisma = new PrismaClient();

// ===========================
// INTERFACES
// ===========================

// Definindo o tipo para o corpo da requisição de criação de peça
interface CreatePieceBody {
  categoryPath: string[];
  description: string;
  quantity?: number;
}

// Interface para filtros de peças
interface FilterPiecesQuery {
  categoryId?: string;
  subcategoryId?: string;
  genderId?: string;
  search?: string;
}

// ===========================
// ROTAS DA API
// ===========================

export default async function inventoryRoutes(fastify: FastifyInstance) {
  const authMiddleware = new AuthMiddleware();

  // ✅ ROTA PARA BUSCAR TODAS AS PEÇAS
  fastify.get('/pieces', { preHandler: authMiddleware.authenticate.bind(authMiddleware) }, async (request, reply) => {
    try {
      const userId = (request as any).userId; // Obter o ID do usuário autenticado
      const pieces = await prisma.piece.findMany({
        where: { userId },
        include: { category: true }, // Incluir informações da categoria, se necessário
        orderBy: { createdAt: 'desc' }
      });

      // Mapear para o formato esperado pelo frontend
      const mappedPieces = pieces.map(piece => ({
        id: piece.id,
        name: piece.description, // O frontend espera 'name', mas o DB tem 'description'
        quantity: piece.quantity,
        categoryPath: piece.categoryPath,
        categoryId: piece.categoryId,
        subcategoryId: piece.subcategoryId,
        genderId: piece.genderId
      }));

      return reply.send({ success: true, data: mappedPieces });
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar peças' });
    }
  });

  // 🔥 NOVA ROTA PARA FILTRAR PEÇAS (ESSA ESTAVA FALTANDO!)
  fastify.get<{ Querystring: FilterPiecesQuery }>('/pieces/filter', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (request: FastifyRequest<{ Querystring: FilterPiecesQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const { categoryId, subcategoryId, genderId, search } = request.query;

      console.log('🔍 Filtrando peças para usuário:', userId, 'com filtros:', request.query);

      // Construir filtros dinamicamente
      const whereClause: any = { userId };

      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      if (subcategoryId) {
        whereClause.subcategoryId = subcategoryId;
      }

      if (genderId) {
        whereClause.genderId = genderId;
      }

      if (search) {
        whereClause.description = {
          contains: search,
          mode: 'insensitive' // Case insensitive search
        };
      }

      console.log('📊 Filtros aplicados no Prisma:', whereClause);

      const pieces = await prisma.piece.findMany({
        where: whereClause,
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });

      console.log('✅ Peças encontradas:', pieces.length);

      // Mapear para o formato esperado pelo frontend
      const mappedPieces = pieces.map(piece => ({
        id: piece.id,
        name: piece.description, // O frontend espera 'name', mas o DB tem 'description'
        quantity: piece.quantity,
        categoryPath: piece.categoryPath,
        categoryId: piece.categoryId,
        subcategoryId: piece.subcategoryId,
        genderId: piece.genderId
      }));

      return reply.send({ success: true, data: mappedPieces });

    } catch (error) {
      console.error('❌ Erro ao filtrar peças:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao filtrar peças' });
    }
  });

  // 1. BUSCAR ÁRVORE COMPLETA DE CATEGORIAS COM PEÇAS DO USUÁRIO
  fastify.get('/categories/tree', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Por enquanto, retornar uma resposta básica
      return reply.send({ 
        success: true, 
        data: [] // Implementar conforme sua necessidade
      });
    } catch (error) {
      console.error('❌ Erro ao buscar árvore de categorias:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar categorias' });
    }
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

      console.log('📦 Criando peça para usuário:', userId, request.body);

      // Validar se as categorias existem (opcional - remova se não tiver tabela Category)
      if (categoryPath[0]) {
        const categoryExists = await prisma.category.findUnique({
          where: { id: categoryPath[0] }
        }).catch(() => null); // Ignorar erro se tabela não existir

        // Se não encontrar e você não tem tabela Category, pode prosseguir
        console.log('📂 Categoria encontrada:', !!categoryExists);
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

      console.log('✅ Peça criada:', piece.id);

      return reply.send({
        success: true,
        data: {
          id: piece.id,
          description: piece.description,
          quantity: piece.quantity,
          categoryPath: piece.categoryPath
        }
      });

    } catch (error) {
      console.error('❌ Erro ao criar peça:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao adicionar peça'
      });
    }
  });
}