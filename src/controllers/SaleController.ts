import { FastifyRequest, FastifyReply } from 'fastify';
import SaleService from '../services/SaleService.js';

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

class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  async createSale(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('🛍️ === SALE CONTROLLER: Criando venda ===');
      
      const { clientName, phone, address } = request.body as CreateSaleBody;
      const userId = (request as any).userId;

      console.log('📋 Request body:', { clientName, phone, address });
      console.log('👤 User ID do middleware:', userId);

      if (!userId) {
        console.log('❌ ID do usuário não encontrado na requisição');
        return reply.status(401).send({
          error: 'ID do usuário não encontrado na requisição.',
        });
      }

      if (!clientName || clientName.trim() === '') {
        console.log('❌ Nome do cliente é obrigatório');
        return reply.status(400).send({
          error: 'O nome do cliente é obrigatório.',
        });
      }

      console.log('✅ Dados válidos, criando venda...');

      const sale = await this.saleService.createSale({
        clientName: clientName.trim(),
        phone: phone?.trim() || undefined,
        address: address?.trim() || undefined,
        userId,
      });

      console.log('✅ Venda criada com sucesso:', sale.id);

      reply.status(201).send({
        message: 'Venda criada com sucesso!',
        data: sale,
      });
    } catch (error: unknown) {
      console.error('💥 Erro no controller de criação de venda:', error);
      reply.status(500).send({
        error: (error instanceof Error) ? error.message : 'Erro interno do servidor',
      });
    }
  }

  // Listar vendas do usuário
  async getSales(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('📋 === SALE CONTROLLER: Listando vendas ===');
      
      const userId = (request as any).userId;
      const query = request.query as GetSalesQuery;

      console.log('👤 User ID do middleware:', userId);
      console.log('🔍 Query params:', query);

      if (!userId) {
        console.log('❌ ID do usuário não encontrado na requisição');
        return reply.status(401).send({
          error: 'ID do usuário não encontrado na requisição.',
        });
      }

      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '10');
      const status = query.status || 'open'; // Por padrão, buscar vendas em aberto

      console.log(`📊 Parâmetros: página ${page}, limite ${limit}, status ${status}`);

      const result = await this.saleService.getSalesByUser({
        userId,
        status,
        page,
        limit
      });

      console.log(`✅ ${result.sales.length} vendas encontradas`);

      reply.status(200).send({
        message: 'Vendas listadas com sucesso!',
        data: result.sales,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: unknown) {
      console.error('💥 Erro no controller ao listar vendas:', error);
      reply.status(500).send({
        error: (error instanceof Error) ? error.message : 'Erro interno do servidor',
      });
    }
  }

  // Obter detalhes de uma venda específica
  async getSaleById(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('🔍 === SALE CONTROLLER: Buscando venda por ID ===');
      
      const { saleId } = request.params as { saleId: string };
      const userId = (request as any).userId;

      console.log('🏷️ Sale ID:', saleId);
      console.log('👤 User ID do middleware:', userId);

      if (!userId) {
        console.log('❌ ID do usuário não encontrado na requisição');
        return reply.status(401).send({
          error: 'ID do usuário não encontrado na requisição.',
        });
      }

      if (!saleId) {
        console.log('❌ ID da venda é obrigatório');
        return reply.status(400).send({
          error: 'ID da venda é obrigatório.',
        });
      }

      const sale = await this.saleService.getSaleById(saleId, userId);

      if (!sale) {
        console.log('❌ Venda não encontrada');
        return reply.status(404).send({
          error: 'Venda não encontrada.',
        });
      }

      console.log('✅ Venda encontrada:', sale.id);

      reply.status(200).send({
        message: 'Venda encontrada com sucesso!',
        data: sale
      });
    } catch (error: unknown) {
      console.error('💥 Erro no controller ao buscar venda:', error);
      reply.status(500).send({
        error: (error instanceof Error) ? error.message : 'Erro interno do servidor',
      });
    }
  }

  async addPieceToSale(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('➕ === SALE CONTROLLER: Adicionando peça à venda ===');
      
      const { saleId } = request.params as AddPieceToSaleParams;
      const { pieceId, quantity } = request.body as AddPieceToSaleBody;

      console.log('🏷️ Sale ID:', saleId);
      console.log('🧩 Piece ID:', pieceId);
      console.log('🔢 Quantity:', quantity);

      if (!saleId || !pieceId || !quantity) {
        console.log('❌ Dados obrigatórios faltando');
        return reply.status(400).send({
          error: 'ID da venda, ID da peça e quantidade são obrigatórios.',
        });
      }
      if (quantity <= 0) {
        console.log('❌ Quantidade inválida');
        return reply.status(400).send({
          error: 'A quantidade deve ser maior que zero.',
        });
      }

      const salePiece = await this.saleService.addPieceToSale({
        saleId,
        pieceId,
        quantity,
      });

      console.log('✅ Peça adicionada à venda com sucesso');

      reply.status(200).send({
        message: 'Peça adicionada à venda com sucesso!',
        data: salePiece,
      });
    } catch (error: unknown) {
      console.error('💥 Erro no controller ao adicionar peça à venda:', error);
      reply.status(500).send({
        error: (error instanceof Error) ? error.message : 'Erro interno do servidor',
      });
    }
  }
}

export default SaleController;