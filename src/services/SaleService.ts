import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateSaleData {
  clientName: string;
  phone?: string;
  address?: string;
  userId: number;
}

interface AddPieceToSaleData {
  saleId: string;
  pieceId: string;
  quantity: number;
}

interface GetSalesParams {
  userId: number;
  status?: 'open' | 'closed';
  page?: number;
  limit?: number;
}

class SaleService {
  async createSale(data: CreateSaleData) {
    try {
      console.log('🛍️ === SALE SERVICE: Criando venda ===');
      console.log('📦 Dados recebidos:', {
        clientName: data.clientName,
        phone: data.phone || 'não informado',
        address: data.address || 'não informado',
        userId: data.userId
      });

      // Validações básicas
      if (!data.clientName || data.clientName.trim() === '') {
        throw new Error('Nome do cliente é obrigatório');
      }

      if (!data.userId || typeof data.userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: data.userId }
      });

      if (!user) {
        console.log('❌ Usuário não encontrado:', data.userId);
        throw new Error('Usuário não encontrado');
      }

      console.log('✅ Usuário encontrado:', user.name);

      const sale = await prisma.sale.create({
        data: {
          clientName: data.clientName.trim(),
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          userId: data.userId,
        },
      });

      console.log('✅ SALE SERVICE: Venda criada com sucesso:', sale.id);
      return sale;
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao criar venda:', error);
      throw error; // Re-throw para que o controller possa tratar
    }
  }

  async getSalesByUser(params: GetSalesParams) {
    try {
      const { userId, status = 'open', page = 1, limit = 10 } = params;
      
      console.log('📋 === SALE SERVICE: Listando vendas ===');
      console.log('👤 User ID:', userId);
      console.log('📊 Status:', status);
      console.log('📄 Página:', page, 'Limite:', limit);

      // Validações
      if (!userId || typeof userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }

      const skip = (page - 1) * limit;

      // Buscar vendas com informações das peças
      const sales = await prisma.sale.findMany({
        where: {
          userId: userId,
        },
        include: {
          salePieces: {
            include: {
              piece: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: skip,
        take: limit,
      });

      // Processar vendas para adicionar informações calculadas
      const processedSales = sales.map(sale => {
        const totalPieces = sale.salePieces.reduce((sum, sp) => sum + sp.quantity, 0);
        const totalValue = sale.salePieces.reduce((sum, sp) => {
          return sum + (sp.piece.price * sp.quantity);
        }, 0);
        
        // Determinar status: 'open' se não tem peças ou valor zero, 'closed' caso contrário
        const currentStatus = totalPieces === 0 || totalValue === 0 ? 'open' : 'closed';
        
        return {
          ...sale,
          totalPieces,
          totalValue,
          status: currentStatus,
          salePieces: sale.salePieces.map(sp => ({
            ...sp,
            piece: {
              id: sp.piece.id,
              description: sp.piece.description,
              price: sp.piece.price,
            }
          }))
        };
      });

      // Filtrar por status se especificado
      const filteredSales = processedSales.filter(sale => {
        if (status === 'open') {
          return sale.status === 'open';
        }
        return sale.status === 'closed';
      });

      // Contar total para paginação (apenas vendas do usuário)
      const totalCount = await prisma.sale.count({
        where: {
          userId: userId,
        }
      });

      // Para o total filtrado, vamos usar o length dos processedSales filtrados
      const totalFiltered = filteredSales.length;

      console.log(`✅ SALE SERVICE: ${filteredSales.length} vendas encontradas de ${totalCount} total`);

      return {
        sales: filteredSales,
        total: totalFiltered,
        page,
        limit
      };
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao listar vendas:', error);
      throw error;
    }
  }

  async getSaleById(saleId: string, userId: number) {
    try {
      console.log('🔍 === SALE SERVICE: Buscando venda por ID ===');
      console.log('🏷️ Sale ID:', saleId);
      console.log('👤 User ID:', userId);

      // Validações
      if (!saleId || saleId.trim() === '') {
        throw new Error('ID da venda é obrigatório');
      }

      if (!userId || typeof userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }

      const sale = await prisma.sale.findFirst({
        where: {
          id: saleId,
          userId: userId, // Garantir que a venda pertence ao usuário
        },
        include: {
          salePieces: {
            include: {
              piece: {
                select: {
                  id: true,
                  description: true,
                  price: true,
                  categoryPath: true,
                }
              }
            }
          }
        }
      });

      if (!sale) {
        console.log('❌ SALE SERVICE: Venda não encontrada');
        return null;
      }

      // Calcular informações adicionais
      const totalPieces = sale.salePieces.reduce((sum, sp) => sum + sp.quantity, 0);
      const totalValue = sale.salePieces.reduce((sum, sp) => {
        return sum + (sp.piece.price * sp.quantity);
      }, 0);

      const processedSale = {
        ...sale,
        totalPieces,
        totalValue,
        status: totalPieces === 0 || totalValue === 0 ? 'open' : 'closed'
      };

      console.log('✅ SALE SERVICE: Venda encontrada:', sale.id);
      return processedSale;
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao buscar venda:', error);
      throw error;
    }
  }

  async addPieceToSale(data: AddPieceToSaleData) {
    try {
      console.log('➕ === SALE SERVICE: Adicionando peça à venda ===');
      console.log('📦 Dados:', data);

      // Validações
      if (!data.saleId || data.saleId.trim() === '') {
        throw new Error('ID da venda é obrigatório');
      }

      if (!data.pieceId || data.pieceId.trim() === '') {
        throw new Error('ID da peça é obrigatório');
      }

      if (!data.quantity || data.quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      // Verificar se a venda existe
      const sale = await prisma.sale.findUnique({
        where: { id: data.saleId }
      });

      if (!sale) {
        throw new Error('Venda não encontrada');
      }

      // Verificar se a peça existe
      const piece = await prisma.piece.findUnique({
        where: { id: data.pieceId }
      });

      if (!piece) {
        throw new Error('Peça não encontrada');
      }

      // Verificar se há estoque suficiente
      if (piece.quantity < data.quantity) {
        throw new Error(`Estoque insuficiente. Disponível: ${piece.quantity}, Solicitado: ${data.quantity}`);
      }

      // Verificar se a peça já foi adicionada à venda
      const existingSalePiece = await prisma.salePiece.findUnique({
        where: {
          saleId_pieceId: {
            saleId: data.saleId,
            pieceId: data.pieceId
          }
        }
      });

      if (existingSalePiece) {
        // Atualizar quantidade se já existe
        const updatedSalePiece = await prisma.salePiece.update({
          where: {
            id: existingSalePiece.id
          },
          data: {
            quantity: existingSalePiece.quantity + data.quantity
          }
        });

        // Atualizar estoque
        await prisma.piece.update({
          where: { id: data.pieceId },
          data: {
            quantity: piece.quantity - data.quantity
          }
        });

        console.log('✅ SALE SERVICE: Quantidade da peça atualizada na venda');
        return updatedSalePiece;
      } else {
        // Criar nova entrada
        const salePiece = await prisma.salePiece.create({
          data: {
            saleId: data.saleId,
            pieceId: data.pieceId,
            quantity: data.quantity,
          },
        });

        // Atualizar estoque
        await prisma.piece.update({
          where: { id: data.pieceId },
          data: {
            quantity: piece.quantity - data.quantity
          }
        });

        console.log('✅ SALE SERVICE: Peça adicionada à venda com sucesso');
        return salePiece;
      }
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao adicionar peça à venda:', error);
      throw error;
    }
  }
}

export default SaleService;