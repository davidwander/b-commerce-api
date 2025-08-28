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

class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  async createSale(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { clientName, phone, address } = request.body as CreateSaleBody;
      const userId = (request as any).userId; // userId é adicionado pelo middleware de autenticação

      if (!userId) {
        return reply.status(401).send({
          error: 'ID do usuário não encontrado na requisição.',
        });
      }

      if (!clientName) {
        return reply.status(400).send({
          error: 'O nome do cliente é obrigatório.',
        });
      }

      const sale = await this.saleService.createSale({
        clientName,
        phone,
        address,
        userId,
      });

      reply.status(201).send({
        message: 'Venda criada com sucesso!',
        data: sale,
      });
    } catch (error: unknown) {
      console.error('Erro no controller de criação de venda:', error);
      reply.status(500).send({
        error: (error instanceof Error) ? error.message : 'Erro interno do servidor',
      });
    }
  }

  async addPieceToSale(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { saleId } = request.params as AddPieceToSaleParams;
      const { pieceId, quantity } = request.body as AddPieceToSaleBody;

      if (!saleId || !pieceId || !quantity) {
        return reply.status(400).send({
          error: 'ID da venda, ID da peça e quantidade são obrigatórios.',
        });
      }
      if (quantity <= 0) {
        return reply.status(400).send({
          error: 'A quantidade deve ser maior que zero.',
        });
      }

      const salePiece = await this.saleService.addPieceToSale({
        saleId,
        pieceId,
        quantity,
      });

      reply.status(200).send({
        message: 'Peça adicionada à venda com sucesso!',
        data: salePiece,
      });
    } catch (error: unknown) {
      console.error('Erro no controller ao adicionar peça à venda:', error);
      reply.status(500).send({
        error: (error instanceof Error) ? error.message : 'Erro interno do servidor',
      });
    }
  }
}

export default SaleController;
