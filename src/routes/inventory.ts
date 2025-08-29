import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import AuthMiddleware from '../middleware/authMiddleware.js'; // 🔧 IMPORTAR SEU MIDDLEWARE

const prisma = new PrismaClient();

// ===========================
// INTERFACES
// ===========================
interface CreatePieceBody {
  categoryPath: string[];
  description: string;
  quantity?: number;
  price?: number;
}

interface FilterPiecesQuery {
  categoryId?: string;
  subcategoryId?: string;
  genderId?: string;
  search?: string;
}

interface UpdatePiecePriceBody {
  price: number;
}

// ===========================
// FUNÇÃO DE VALIDAÇÃO DE CATEGORIA
// ===========================
async function validateCategoryPath(categoryPath: string[]) {
  if (!categoryPath || categoryPath.length === 0) {
    throw new Error('categoryPath vazio');
  }

  let parentId: string | null = null;

  for (let i = 0; i < categoryPath.length; i++) {
    const id = categoryPath[i];

    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new Error(`Categoria não encontrada: ${id}`);
    }

    // Checa hierarquia
    if (i > 0 && category.parentId !== parentId) {
      throw new Error(`Categoria ${id} não corresponde ao pai ${parentId}`);
    }

    parentId = id;
  }

  // Verifica se último nível é folha
  const lastCategory = await prisma.category.findUnique({
    where: { id: categoryPath[categoryPath.length - 1] },
  });

  if (!lastCategory) throw new Error('Última categoria não encontrada');
  if (!lastCategory.isLeaf) {
    throw new Error(
      `Última categoria (${lastCategory.id}) não é leaf. Só é permitido adicionar peças em categorias folha.`
    );
  }

  return true;
}

// ===========================
// ROTAS
// ===========================
export default async function inventoryRoutes(fastify: FastifyInstance) {
  const authMiddleware = new AuthMiddleware();

  // ✅ Buscar todas as peças
  fastify.get('/pieces', { preHandler: authMiddleware.authenticate.bind(authMiddleware) }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const pieces = await prisma.piece.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });

      const mappedPieces = pieces.map(piece => ({
        id: piece.id,
        name: piece.description,
        description: piece.description,
        quantity: piece.quantity,
        categoryPath: piece.categoryPath,
        categoryId: piece.categoryId,
        subcategoryId: piece.subcategoryId,
        genderId: piece.genderId,
        price: piece.price
      }));

      return reply.send({ success: true, data: mappedPieces });
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar peças' });
    }
  });

  // 🔥 Filtrar peças
  fastify.get<{ Querystring: FilterPiecesQuery }>('/pieces/filter', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (request: FastifyRequest<{ Querystring: FilterPiecesQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const { categoryId, subcategoryId, genderId, search } = request.query;

      const whereClause: any = { userId };

      if (categoryId) whereClause.categoryId = categoryId;
      if (subcategoryId) whereClause.subcategoryId = subcategoryId;
      if (genderId) whereClause.genderId = genderId;
      if (search) whereClause.description = { contains: search, mode: 'insensitive' };

      const pieces = await prisma.piece.findMany({
        where: whereClause,
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      });

      const mappedPieces = pieces.map(piece => ({
        id: piece.id,
        name: piece.description,
        quantity: piece.quantity,
        categoryPath: piece.categoryPath,
        categoryId: piece.categoryId,
        subcategoryId: piece.subcategoryId,
        genderId: piece.genderId,
        price: piece.price
      }));

      return reply.send({ success: true, data: mappedPieces });
    } catch (error) {
      console.error('Erro ao filtrar peças:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao filtrar peças' });
    }
  });

  // 1. Árvores de categorias
  fastify.get('/categories/tree', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.send({ success: true, data: [] });
    } catch (error) {
      console.error('Erro ao buscar árvore de categorias:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar categorias' });
    }
  });

  // 2. Adicionar nova peça
  fastify.post<{ Body: CreatePieceBody }>('/pieces', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware),
  }, async (request: FastifyRequest<{ Body: CreatePieceBody }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const { categoryPath, description, quantity = 1, price = 0.0 } = request.body;

      console.log('📦 Criando peça para usuário:', userId, request.body);

      // 🔍 Validação detalhada
      await validateCategoryPath(categoryPath);

      const categoryId = categoryPath[0];
      const subcategoryId = categoryPath[1] || null;
      const genderId = categoryPath[2] || null;

      const piece = await prisma.piece.create({
        data: {
          description,
          categoryId,
          subcategoryId,
          genderId,
          categoryPath: categoryPath.join('/'),
          quantity,
          userId,
          price,
        },
      });

      console.log('✅ Peça criada:', piece.id);

      return reply.send({ success: true, data: piece });
    } catch (error: any) {
      console.error('❌ Erro ao criar peça:', error.message);
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  // 3. Atualizar preço
  fastify.put<{ Params: { id: string }, Body: UpdatePiecePriceBody }>('/pieces/:id/price', {
    preHandler: authMiddleware.authenticate.bind(authMiddleware),
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: UpdatePiecePriceBody }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params;
      const { price } = request.body;

      const updatedPiece = await prisma.piece.update({
        where: { id, userId },
        data: { price },
      });

      return reply.send({ success: true, data: { id: updatedPiece.id, price: updatedPiece.price } });
    } catch (error) {
      console.error('Erro ao atualizar preço da peça:', error);
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar preço da peça' });
    }
  });
}
