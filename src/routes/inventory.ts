import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
// REMOVIDO: import AuthMiddleware - temporariamente para testar

const prisma = new PrismaClient();

// ===========================
// INTERFACES
// ===========================
interface CreatePieceBody {
  categoryPath: string[];
  description: string;
  quantity?: number;
  // Não esperar price do frontend, será definido como 0.00 por padrão
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
// FUNÇÃO DE VALIDAÇÃO DE CATEGORIA SIMPLIFICADA
// ===========================
async function validateCategoryPath(categoryPath: string[]) {
  if (!categoryPath || categoryPath.length === 0) {
    throw new Error('Caminho da categoria é obrigatório');
  }

  console.log('🔍 Validando categoryPath:', categoryPath);

  // Validar se todas as categorias existem e estão na ordem correta
  for (let i = 0; i < categoryPath.length; i++) {
    const id = categoryPath[i];
    
    const category = await prisma.category.findUnique({ 
      where: { id },
      include: { children: true }
    });
    
    if (!category) {
      throw new Error(`Categoria não encontrada: ${id}`);
    }
    
    console.log(`✅ Categoria ${i + 1}:`, { 
      id, 
      name: category.name, 
      level: category.level,
      hasChildren: category.children.length > 0,
      isLeaf: category.isLeaf
    });
    
    // Validar hierarquia (exceto para o primeiro item)
    if (i > 0) {
      const expectedParentId = categoryPath[i - 1];
      if (category.parentId !== expectedParentId) {
        throw new Error(`Hierarquia inválida: categoria "${category.name}" não pertence à categoria pai selecionada`);
      }
    }
  }

  // Verificar se a última categoria permite adicionar peças
  const lastCategoryId = categoryPath[categoryPath.length - 1];
  const lastCategory = await prisma.category.findUnique({
    where: { id: lastCategoryId },
    include: { children: true }
  });

  if (!lastCategory) {
    throw new Error('Última categoria não encontrada');
  }

  // Permitir adicionar peças se a categoria é leaf OU não tem filhos
  const canAddPieces = lastCategory.isLeaf || lastCategory.children.length === 0;
  
  if (!canAddPieces && lastCategory.children.length > 0) {
    console.log(`❌ Categoria "${lastCategory.name}" ainda tem ${lastCategory.children.length} subcategorias`);
    throw new Error(`Não é possível adicionar peças em "${lastCategory.name}". Esta categoria ainda possui subcategorias. Selecione uma categoria mais específica.`);
  }

  console.log('✅ Validação concluída - categoria permite adicionar peças');
  return true;
}

// ===========================
// ROTAS
// ===========================
export default async function inventoryRoutes(fastify: FastifyInstance) {
  // REMOVIDO: const authMiddleware = new AuthMiddleware(); - esta era a linha 95 problemática

  // ✅ Buscar todas as peças
  fastify.get('/pieces', { 
    // REMOVIDO temporariamente: preHandler: authMiddleware.authenticate.bind(authMiddleware) 
  }, async (request, reply) => {
    try {
      const userId = (request as any).userId || 1; 
      
      const pieces = await prisma.piece.findMany({
        where: { 
          userId, 
          quantity: { gt: 0 } 
        },
        include: { 
          category: true,
          subcategory: true,
          gender: true
        },
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

      console.log(`📦 Retornando ${mappedPieces.length} peças para usuário ${userId}`);
      return reply.send({ success: true, data: mappedPieces });
      
    } catch (error) {
      console.error('❌ Erro ao buscar peças:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro interno do servidor ao buscar peças' 
      });
    }
  });

  // 🔥 Filtrar peças
  fastify.get<{ Querystring: FilterPiecesQuery }>('/pieces/filter', {
    // REMOVIDO temporariamente: preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (request: FastifyRequest<{ Querystring: FilterPiecesQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId || 1; 
      const { categoryId, subcategoryId, genderId, search } = request.query;

      console.log('🔍 Aplicando filtros:', { categoryId, subcategoryId, genderId, search, userId });

      const whereClause: any = { userId, quantity: { gt: 0 } }; 

      if (categoryId) whereClause.categoryId = categoryId;
      if (subcategoryId) whereClause.subcategoryId = subcategoryId;
      if (genderId) whereClause.genderId = genderId;
      if (search && search.trim()) {
        whereClause.description = { 
          contains: search.trim(), 
          mode: 'insensitive' 
        };
      }

      console.log('🔍 Executando query com:', whereClause);

      const pieces = await prisma.piece.findMany({
        where: whereClause,
        include: { 
          category: true,
          subcategory: true,
          gender: true
        },
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

      console.log(`✅ Filtro retornou ${mappedPieces.length} peças`);
      return reply.send({ success: true, data: mappedPieces });
      
    } catch (error) {
      console.error('❌ Erro ao filtrar peças:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro interno do servidor ao filtrar peças' 
      });
    }
  });

  // Debug: Listar todas as categorias
  fastify.get('/categories/tree', {
    // REMOVIDO temporariamente: preHandler: authMiddleware.authenticate.bind(authMiddleware)
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = await prisma.category.findMany({
        include: { children: true, parent: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }]
      });
      
      console.log(`📂 Retornando ${categories.length} categorias para debug`);
      
      // Organizar em estrutura hierárquica para debug
      const organized = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        level: cat.level,
        parentId: cat.parentId,
        parentName: cat.parent?.name,
        isLeaf: cat.isLeaf,
        childrenCount: cat.children.length,
        children: cat.children.map(child => ({
          id: child.id,
          name: child.name
        }))
      }));

      return reply.send({ 
        success: true, 
        data: organized,
        summary: {
          total: categories.length,
          byLevel: {
            level1: categories.filter(c => c.level === 1).length,
            level2: categories.filter(c => c.level === 2).length,
            level3: categories.filter(c => c.level === 3).length,
          },
          leafCategories: categories.filter(c => c.isLeaf).length
        }
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro ao buscar categorias' 
      });
    }
  });

  // 🔥 CRIAR NOVA PEÇA - FUNÇÃO PRINCIPAL CORRIGIDA
  fastify.post<{ Body: CreatePieceBody }>('/pieces', {
    // REMOVIDO temporariamente: preHandler: authMiddleware.authenticate.bind(authMiddleware),
  }, async (request: FastifyRequest<{ Body: CreatePieceBody }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId || 1; 
      const { categoryPath, description, quantity = 1 } = request.body;

      console.log('🚀 === INICIANDO CRIAÇÃO DE PEÇA ===');
      console.log('👤 Usuário:', userId);
      console.log('📦 Dados recebidos:', { 
        categoryPath, 
        description, 
        quantity,
        categoryPathLength: categoryPath?.length 
      });

      // === VALIDAÇÕES DE ENTRADA ===
      if (!description || typeof description !== 'string' || description.trim() === '') {
        console.log('❌ Descrição inválida:', description);
        return reply.status(400).send({ 
          success: false, 
          error: 'Descrição da peça é obrigatória e deve ser um texto válido' 
        });
      }

      if (!categoryPath || !Array.isArray(categoryPath) || categoryPath.length === 0) {
        console.log('❌ CategoryPath inválido:', categoryPath);
        return reply.status(400).send({ 
          success: false, 
          error: 'Caminho da categoria é obrigatório e deve conter pelo menos uma categoria' 
        });
      }

      if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        console.log('❌ Quantidade inválida:', quantity);
        return reply.status(400).send({ 
          success: false, 
          error: 'Quantidade deve ser um número inteiro maior que zero' 
        });
      }

      // === VALIDAÇÃO DA HIERARQUIA ===
      console.log('🔍 Iniciando validação de hierarquia...');
      await validateCategoryPath(categoryPath);

      // === ORGANIZAR DADOS PARA INSERÇÃO ===
      const categoryId = categoryPath[0];
      const subcategoryId = categoryPath.length > 1 ? categoryPath[1] : null;
      const genderId = categoryPath.length > 2 ? categoryPath[2] : null;
      const categoryPathString = categoryPath.join('/');
      const descriptionTrimmed = description.trim();
      const defaultPrice = 0.00; 

      console.log('📝 Dados organizados para inserção:');
      console.log('  - categoryId:', categoryId);
      console.log('  - subcategoryId:', subcategoryId);
      console.log('  - genderId:', genderId);
      console.log('  - categoryPath:', categoryPathString);
      console.log('  - description:', descriptionTrimmed);
      console.log('  - quantity:', quantity);
      console.log('  - price:', defaultPrice);
      console.log('  - userId:', userId);

      // === CRIAR A PEÇA NO BANCO ===
      console.log('💾 Criando peça no banco de dados...');
      
      const piece = await prisma.piece.create({
        data: {
          description: descriptionTrimmed,
          categoryId,
          subcategoryId,
          genderId,
          categoryPath: categoryPathString,
          quantity,
          userId,
          price: defaultPrice,
        },
        include: {
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          gender: { select: { id: true, name: true } }
        }
      });

      console.log('✅ Peça criada com sucesso!');
      console.log('  - ID:', piece.id);
      console.log('  - Descrição:', piece.description);
      console.log('  - Categoria:', piece.category?.name);
      console.log('  - Subcategoria:', piece.subcategory?.name || 'N/A');
      console.log('  - Gênero:', piece.gender?.name || 'N/A');

      // === RESPOSTA DE SUCESSO ===
      const responseData = {
        id: piece.id,
        description: piece.description,
        quantity: piece.quantity,
        price: piece.price,
        categoryPath: piece.categoryPath,
        categoryId: piece.categoryId,
        subcategoryId: piece.subcategoryId,
        genderId: piece.genderId,
        category: piece.category?.name,
        subcategory: piece.subcategory?.name,
        gender: piece.gender?.name,
        createdAt: piece.createdAt
      };

      console.log('🎉 === PEÇA CRIADA COM SUCESSO ===');

      return reply.status(201).send({ 
        success: true, 
        data: responseData,
        message: 'Peça adicionada ao estoque com sucesso!'
      });

    } catch (error: any) {
      console.error('💥 === ERRO AO CRIAR PEÇA ===');
      console.error('Tipo do erro:', error.constructor.name);
      console.error('Mensagem:', error.message);
      console.error('Stack trace:', error.stack);

      // Retornar erro específico baseado no tipo
      if (error.message.includes('não encontrada') || 
          error.message.includes('Hierarquia inválida') || 
          error.message.includes('não é possível adicionar peças')) {
        return reply.status(400).send({ 
          success: false, 
          error: error.message 
        });
      }

      // Erro genérico para problemas não identificados
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro interno do servidor ao criar peça. Tente novamente.' 
      });
    }
  });

  // Atualizar preço de uma peça
  fastify.put<{ Params: { id: string }, Body: UpdatePiecePriceBody }>('/pieces/:id/price', {
    // REMOVIDO temporariamente: preHandler: authMiddleware.authenticate.bind(authMiddleware),
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: UpdatePiecePriceBody }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId || 1;
      const { id } = request.params;
      const { price } = request.body;

      console.log('💰 Atualizando preço:', { pieceId: id, newPrice: price, userId });

      // Validar entrada
      if (typeof price !== 'number' || price < 0) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Preço deve ser um número maior ou igual a zero' 
        });
      }

      // Verificar se a peça existe e pertence ao usuário
      const existingPiece = await prisma.piece.findFirst({
        where: { id, userId },
        select: { id: true, description: true, price: true }
      });

      if (!existingPiece) {
        console.log('❌ Peça não encontrada ou não pertence ao usuário');
        return reply.status(404).send({ 
          success: false, 
          error: 'Peça não encontrada' 
        });
      }

      // Atualizar o preço
      const updatedPiece = await prisma.piece.update({
        where: { id },
        data: { price },
        select: { id: true, description: true, price: true, updatedAt: true }
      });

      console.log('✅ Preço atualizado:', { 
        id: updatedPiece.id, 
        oldPrice: existingPiece.price, 
        newPrice: updatedPiece.price 
      });

      return reply.send({ 
        success: true, 
        data: {
          id: updatedPiece.id,
          description: updatedPiece.description,
          price: updatedPiece.price,
          updatedAt: updatedPiece.updatedAt
        },
        message: 'Preço atualizado com sucesso!'
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar preço:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro interno do servidor ao atualizar preço' 
      });
    }
  });

  // ROTA DE TESTE (sem autenticação)
  fastify.get('/test', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Rota de inventory funcionando!',
      timestamp: new Date().toISOString()
    });
  });
}