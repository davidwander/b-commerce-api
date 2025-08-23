
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import AuthMiddleware from '../middleware/authMiddleware.js' // 🔧 IMPORTAR SEU MIDDLEWARE

const prisma = new PrismaClient()

// ===========================
// TIPOS TYPESCRIPT
// ===========================

type PartLeaf = {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}

type PartNode = {
  id: string;
  name: string;
  children?: Array<PartNode | PartLeaf>;
}

interface CreatePieceBody {
  categoryPath: string[];
  description: string;
  quantity?: number;
}

interface FilterPiecesQuery {
  categoryId?: string;
  subcategoryId?: string;
  genderId?: string;
  search?: string;
}

interface UpdateQuantityBody {
  quantity: number;
}

// ===========================
// MIDDLEWARE DE AUTENTICAÇÃO
// ===========================
const authMiddleware = new AuthMiddleware();

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  // Usar o mesmo middleware do seu sistema de auth
  await authMiddleware.authenticate(request, reply);
}

// ===========================
// FUNÇÕES AUXILIARES
// ===========================

async function buildCategoryTree(userId: number): Promise<PartNode[]> {
  // Buscar todas as categorias
  const categories = await prisma.category.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }]
  })

  // Buscar todas as peças do usuário
  const userPieces = await prisma.piece.findMany({
    where: { userId },
    include: {
      category: true,
      subcategory: true,
      gender: true
    }
  })

  // Construir árvore hierárquica
  const categoryMap = new Map<string, PartNode>()

  // Criar nós das categorias
  categories.forEach(cat => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      children: []
    })
  })

  // Montar hierarquia
  const rootCategories: PartNode[] = []

  categories.forEach(cat => {
    const node = categoryMap.get(cat.id)!
    
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(node)
      }
    } else {
      rootCategories.push(node)
    }
  })

  // Adicionar peças nas folhas apropriadas
  userPieces.forEach(piece => {
    const leafId = piece.genderId || piece.subcategoryId || piece.categoryId
    const leafNode = categoryMap.get(leafId)
    
    if (leafNode) {
      if (!leafNode.children) leafNode.children = []
      
      leafNode.children.push({
        id: piece.id,
        name: piece.description,
        quantity: piece.quantity
      })
    }
  })

  return rootCategories
}

// ===========================
// ROTAS DA API
// ===========================

export default async function inventoryRoutes(fastify: FastifyInstance) {
  
  // 1. BUSCAR ÁRVORE COMPLETA DE CATEGORIAS COM PEÇAS DO USUÁRIO
  fastify.get('/categories/tree', {
    preHandler: authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId // 🔧 AJUSTADO para seu sistema
      const tree = await buildCategoryTree(userId)
      
      return reply.send({
        success: true,
        data: tree
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar categorias'
      })
    }
  })

  // 2. ADICIONAR NOVA PEÇA
  fastify.post<{ Body: CreatePieceBody }>('/pieces', {
    preHandler: authenticate,
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
      const userId = (request as any).userId // 🔧 AJUSTADO para seu sistema
      const { categoryPath, description, quantity = 1 } = request.body

      // Validar se as categorias existem
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryPath[0] }
      })

      if (!categoryExists) {
        return reply.status(400).send({
          success: false,
          error: 'Categoria não encontrada'
        })
      }

      // Determinar IDs das categorias
      const categoryId = categoryPath[0]
      const subcategoryId = categoryPath[1] || null
      const genderId = categoryPath[2] || null

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
      })

      return reply.send({
        success: true,
        data: {
          id: piece.id,
          description: piece.description,
          quantity: piece.quantity
        }
      })

    } catch (error) {
      console.error('Erro ao criar peça:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao adicionar peça'
      })
    }
  })

  // 3. BUSCAR PEÇAS FILTRADAS
  fastify.get<{ Querystring: FilterPiecesQuery }>('/pieces/filter', {
    preHandler: authenticate
  }, async (request: FastifyRequest<{ Querystring: FilterPiecesQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId // 🔧 AJUSTADO para seu sistema
      const { categoryId, subcategoryId, genderId, search } = request.query

      const whereClause: any = { userId }

      if (categoryId) whereClause.categoryId = categoryId
      if (subcategoryId) whereClause.subcategoryId = subcategoryId
      if (genderId) whereClause.genderId = genderId
      if (search) {
        whereClause.description = {
          contains: search,
          mode: 'insensitive'
        }
      }

      const pieces = await prisma.piece.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          description: true,
          quantity: true
        }
      })

      // Transformar para formato PartLeaf
      const formattedPieces: PartLeaf[] = pieces.map(piece => ({
        id: piece.id,
        name: piece.description,
        quantity: piece.quantity,
        description: piece.description
      }))

      return reply.send({
        success: true,
        data: formattedPieces
      })

    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar peças'
      })
    }
  })

  // 4. ATUALIZAR QUANTIDADE DE UMA PEÇA
  fastify.put<{ Params: { id: string }, Body: UpdateQuantityBody }>('/pieces/:id/quantity', {
    preHandler: authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['quantity'],
        properties: {
          quantity: { type: 'number', minimum: 0 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateQuantityBody }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId // 🔧 AJUSTADO para seu sistema
      const { id } = request.params
      const { quantity } = request.body

      // Verificar se a peça pertence ao usuário
      const piece = await prisma.piece.findFirst({
        where: { id, userId }
      })

      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: 'Peça não encontrada'
        })
      }

      // Atualizar quantidade
      const updatedPiece = await prisma.piece.update({
        where: { id },
        data: { quantity }
      })

      return reply.send({
        success: true,
        data: {
          id: updatedPiece.id,
          quantity: updatedPiece.quantity
        }
      })

    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar quantidade'
      })
    }
  })

  // 5. EXCLUIR PEÇA
  fastify.delete<{ Params: { id: string } }>('/pieces/:id', {
    preHandler: authenticate
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId // 🔧 AJUSTADO para seu sistema
      const { id } = request.params

      // Verificar se a peça pertence ao usuário
      const piece = await prisma.piece.findFirst({
        where: { id, userId }
      })

      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: 'Peça não encontrada'
        })
      }

      // Excluir peça
      await prisma.piece.delete({
        where: { id }
      })

      return reply.send({
        success: true,
        message: 'Peça excluída com sucesso'
      })

    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao excluir peça'
      })
    }
  })
}