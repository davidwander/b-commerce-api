import prismaClient from '../prisma/index.js';

interface CreateSaleRequest {
  clientName: string;
  phone?: string;
  address?: string;
  userId: number;
}

interface AddPieceToSaleRequest {
  saleId: string;
  pieceId: string;
  quantity: number;
}

class SaleService {
  async createSale({ clientName, phone, address, userId }: CreateSaleRequest) {
    try {
      const sale = await prismaClient.sale.create({
        data: {
          clientName,
          phone,
          address,
          userId,
        },
      });

      return sale;
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      throw new Error('Não foi possível criar a venda.');
    }
  }

  async addPieceToSale({ saleId, pieceId, quantity }: AddPieceToSaleRequest) {
    try {
      // Verificar se a venda e a peça existem
      const sale = await prismaClient.sale.findUnique({ where: { id: saleId } });
      const piece = await prismaClient.piece.findUnique({ where: { id: pieceId } });

      if (!sale) {
        throw new Error('Venda não encontrada.');
      }
      if (!piece) {
        throw new Error('Peça não encontrada.');
      }

      // Verificar estoque (opcional, pode ser mais sofisticado)
      if (piece.quantity < quantity) {
        throw new Error('Estoque insuficiente.');
      }

      // Adicionar peça à venda ou atualizar quantidade se já existir
      const salePiece = await prismaClient.salePiece.upsert({
        where: {
          saleId_pieceId: { saleId, pieceId },
        },
        update: {
          quantity: {
            increment: quantity,
          },
        },
        create: {
          saleId,
          pieceId,
          quantity,
        },
      });

      // Atualizar estoque da peça (reduzir a quantidade)
      await prismaClient.piece.update({
        where: { id: pieceId },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      return salePiece;
    } catch (error) {
      console.error('Erro ao adicionar peça à venda:', error);
      throw new Error('Não foi possível adicionar a peça à venda.');
    }
  }
}

export default SaleService;
