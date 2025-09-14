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
  status?: 'open-no-pieces' | 'open-awaiting-payment' | 'closed' | 'calculate-shipping' | 'shipping-awaiting-payment' | 'shipping-date-pending' | ('open-no-pieces' | 'open-awaiting-payment' | 'calculate-shipping' | 'shipping-awaiting-payment' | 'shipping-date-pending')[];
  page?: number;
  limit?: number;
}

interface UpdateShippingValueData {
  saleId: string;
  userId: number;
  shippingValue: number;
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
      const { userId, status, page = 1, limit = 10 } = params;
      const effectiveStatus = status || ['open-no-pieces', 'open-awaiting-payment', 'calculate-shipping', 'shipping-awaiting-payment', 'shipping-date-pending']; // Incluído 'shipping-awaiting-payment' e 'shipping-date-pending'
      
      console.log('📋 === SALE SERVICE: Listando vendas ===');
      console.log('👤 User ID:', userId);
      console.log('📊 Status:', effectiveStatus);
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
          status: Array.isArray(effectiveStatus) ? { in: effectiveStatus } : effectiveStatus,
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

      // O status já vem filtrado do banco de dados.
      // As propriedades totalPieces e totalValue ainda precisam ser calculadas para cada venda.
      const processedSales = sales.map(sale => {
        const totalPieces = sale.salePieces.reduce((sum, sp) => sum + sp.quantity, 0);
        const totalValue = sale.salePieces.reduce((sum, sp) => {
          return sum + (sp.piece.price * sp.quantity);
        }, 0);
        
        return {
          ...sale,
          totalPieces,
          totalValue,
          status: sale.status, // Usar o status que já veio do DB
          shippingValue: sale.shippingValue, // Incluir o valor do frete
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

      // Contar total para paginação (apenas vendas do usuário com o status filtrado)
      const totalCount = await prisma.sale.count({
        where: {
          userId: userId,
          status: Array.isArray(effectiveStatus) ? { in: effectiveStatus } : effectiveStatus,
        }
      });

      // O totalFiltered agora é o totalCount direto do DB após o filtro de status
      const totalFiltered = totalCount;

      console.log(`✅ SALE SERVICE: ${processedSales.length} vendas encontradas de ${totalFiltered} total`);

      return {
        sales: processedSales,
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
        status: sale.status, // Usar o status que já veio do DB
        shippingValue: sale.shippingValue, // Incluir o valor do frete
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

        // Atualizar o status da venda se necessário (após a primeira peça)
        if (sale.status === 'open-no-pieces') {
          await prisma.sale.update({
            where: { id: sale.id },
            data: { status: 'open-awaiting-payment' }
          });
          console.log(`✅ SALE SERVICE: Status da venda ${sale.id} atualizado para 'open-awaiting-payment'`);
        }

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

        // Atualizar o status da venda (primeira peça adicionada)
        if (sale.status === 'open-no-pieces') {
          await prisma.sale.update({
            where: { id: sale.id },
            data: { status: 'open-awaiting-payment' }
          });
          console.log(`✅ SALE SERVICE: Status da venda ${sale.id} atualizado para 'open-awaiting-payment'`);
        }

        console.log('✅ SALE SERVICE: Peça adicionada à venda com sucesso');
        return salePiece;
      }
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao adicionar peça à venda:', error);
      throw error;
    }
  }

  async confirmPayment(saleId: string, userId: number) {
    try {
      console.log('💰 === SALE SERVICE: Confirmando pagamento da venda ===');
      console.log('🏷️ Sale ID:', saleId);
      console.log('👤 User ID:', userId);

      if (!saleId || saleId.trim() === '') {
        throw new Error('ID da venda é obrigatório');
      }
      if (!userId || typeof userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }

      const sale = await prisma.sale.findFirst({
        where: { id: saleId, userId: userId },
      });

      if (!sale) {
        throw new Error('Venda não encontrada ou não pertence ao usuário');
      }

      if (sale.status === 'closed') {
        throw new Error('Esta venda já está fechada');
      }

      const totalPiecesInSale = await prisma.salePiece.count({
        where: { saleId: sale.id }
      });

      if (totalPiecesInSale === 0) {
        throw new Error('Não é possível fechar uma venda sem peças.');
      }

      const updatedSale = await prisma.sale.update({
        where: { id: saleId },
        data: { status: 'calculate-shipping' },
      });

      console.log('✅ SALE SERVICE: Status da venda atualizado para calcular frete:', updatedSale.id);
      return updatedSale;
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao confirmar pagamento:', error);
      throw error;
    }
  }

  async updateShippingValue(data: UpdateShippingValueData) {
    try {
      console.log('🚚 === SALE SERVICE: Atualizando valor do frete ===');
      console.log('📦 Dados:', data);

      if (!data.saleId || data.saleId.trim() === '') {
        throw new Error('ID da venda é obrigatório');
      }
      if (!data.userId || typeof data.userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }
      if (data.shippingValue < 0) {
        throw new Error('O valor do frete não pode ser negativo');
      }

      // Verificar se a venda existe e pertence ao usuário
      const sale = await prisma.sale.findFirst({
        where: { id: data.saleId, userId: data.userId },
      });

      if (!sale) {
        throw new Error('Venda não encontrada ou não pertence ao usuário');
      }

      // Se a venda está em 'calculate-shipping', atualize para 'closed' após adicionar o frete
      const newStatus = sale.status === 'calculate-shipping' ? 'shipping-awaiting-payment' : sale.status; // Altera para 'shipping-awaiting-payment'

      const updatedSale = await prisma.sale.update({
        where: { id: data.saleId },
        data: {
          shippingValue: data.shippingValue,
          status: newStatus,
        },
      });

      console.log('✅ SALE SERVICE: Valor do frete atualizado com sucesso para venda:', updatedSale.id);
      return updatedSale;
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao atualizar valor do frete:', error);
      throw error;
    }
  }

  async confirmShippingPayment(saleId: string, userId: number) {
    try {
      console.log('💰 === SALE SERVICE: Confirmando pagamento do frete ===');
      console.log('🏷️ Sale ID:', saleId);
      console.log('👤 User ID:', userId);

      if (!saleId || saleId.trim() === '') {
        throw new Error('ID da venda é obrigatório');
      }
      if (!userId || typeof userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }

      const sale = await prisma.sale.findFirst({
        where: { id: saleId, userId: userId },
      });

      if (!sale) {
        throw new Error('Venda não encontrada ou não pertence ao usuário');
      }

      if (sale.status === 'closed') {
        throw new Error('Esta venda já está fechada');
      }

      if (sale.status !== 'shipping-awaiting-payment') {
        throw new Error('Não é possível confirmar o pagamento do frete para vendas neste status.');
      }

      if (sale.shippingValue === null || sale.shippingValue === undefined) {
        throw new Error('Não é possível confirmar o pagamento do frete sem um valor de frete definido.');
      }

      const updatedSale = await prisma.sale.update({
        where: { id: saleId },
        data: { status: 'shipping-date-pending' }, // Altera para 'shipping-date-pending'
      });

      console.log('✅ SALE SERVICE: Pagamento do frete confirmado. Status: shipping-date-pending:', updatedSale.id);
      return updatedSale;
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao confirmar pagamento do frete:', error);
      throw error;
    }
  }

  async confirmShippingDate(saleId: string, userId: number) {
    try {
      console.log('📦 === SALE SERVICE: Confirmando data de envio ===');
      console.log('🏷️ Sale ID:', saleId);
      console.log('👤 User ID:', userId);

      if (!saleId || saleId.trim() === '') {
        throw new Error('ID da venda é obrigatório');
      }
      if (!userId || typeof userId !== 'number') {
        throw new Error('ID do usuário é obrigatório e deve ser um número');
      }

      const sale = await prisma.sale.findFirst({
        where: { id: saleId, userId: userId },
      });

      if (!sale) {
        throw new Error('Venda não encontrada ou não pertence ao usuário');
      }

      if (sale.status === 'closed') {
        throw new Error('Esta venda já está fechada');
      }

      if (sale.status !== 'shipping-date-pending') {
        throw new Error('Não é possível confirmar a data de envio para vendas neste status.');
      }

      const updatedSale = await prisma.sale.update({
        where: { id: saleId },
        data: { status: 'closed' },
      });

      console.log('✅ SALE SERVICE: Data de envio confirmada e venda fechada:', updatedSale.id);
      return updatedSale;
    } catch (error) {
      console.error('❌ SALE SERVICE: Erro ao confirmar data de envio:', error);
      throw error;
    }
  }
}

export default SaleService;