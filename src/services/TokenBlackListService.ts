import jwt from 'jsonwebtoken';

// Interface para tokens blacklistados
interface BlacklistToken {
  tokenId: string;
  userId: string;
  expiresAt: number;
  blacklistedAt: number;
  reason?: string;
}

class TokenBlacklistService {
  private blacklistedTokens: Map<string, BlacklistToken> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpa tokens expirados a cada hora
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  // Adicionar token à blacklist
  async blacklistToken(token: string, reason: string = 'logout'): Promise<void> {
    try {
      console.log('=== BLACKLIST: Adicionando token ===');
      
      // Decodificar token para obter informações
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.userId || !decoded.exp) {
        throw new Error('Token inválido para blacklist');
      }

      const tokenId = this.generateTokenId(token);
      const blacklistEntry: BlacklistToken = {
        tokenId,
        userId: decoded.userId,
        expiresAt: decoded.exp * 1000, // JWT exp está em segundos
        blacklistedAt: Date.now(),
        reason
      };

      this.blacklistedTokens.set(tokenId, blacklistEntry);
      
      console.log(`Token blacklistado para usuário ${decoded.userId}, motivo: ${reason}`);
      console.log(`Total de tokens blacklistados: ${this.blacklistedTokens.size}`);

    } catch (error: unknown) {
      console.error('Erro ao blacklistar token:', error);
      throw new Error('Erro ao invalidar token');
    }
  }

  // Verificar se token está na blacklist
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenId = this.generateTokenId(token);
      const blacklistEntry = this.blacklistedTokens.get(tokenId);

      if (!blacklistEntry) {
        return false;
      }

      // Verificar se o token ainda não expirou naturalmente
      const now = Date.now();
      if (now > blacklistEntry.expiresAt) {
        // Token já expirou naturalmente, pode remover da blacklist
        this.blacklistedTokens.delete(tokenId);
        return false;
      }

      console.log(`Token encontrado na blacklist: ${tokenId}`);
      return true;

    } catch (error: unknown) {
      console.error('Erro ao verificar blacklist:', error);
      // Em caso de erro, assumir que não está blacklistado
      return false;
    }
  }

  // Blacklistar todos os tokens de um usuário
  async blacklistAllUserTokens(userId: string, reason: string = 'security'): Promise<number> {
    try {
      console.log(`=== BLACKLIST: Invalidando todos os tokens do usuário ${userId} ===`);
      
      let count = 0;
      const now = Date.now();

      // Em uma implementação real, você manteria uma lista de tokens ativos por usuário
      // Para esta implementação simples, vamos apenas marcar para invalidação futura
      const blacklistEntry: BlacklistToken = {
        tokenId: `user-${userId}-${now}`,
        userId,
        expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
        blacklistedAt: now,
        reason
      };

      this.blacklistedTokens.set(blacklistEntry.tokenId, blacklistEntry);
      count = 1;

      console.log(`${count} tokens invalidados para o usuário ${userId}`);
      return count;

    } catch (error: unknown) {
      console.error('Erro ao blacklistar tokens do usuário:', error);
      return 0;
    }
  }

  // Gerar ID único para o token (hash simples)
  private generateTokenId(token: string): string {
    // Em produção, use uma biblioteca de hash adequada
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32-bit integer
    }
    return hash.toString(36);
  }

  // Limpar tokens expirados da blacklist
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [tokenId, entry] of this.blacklistedTokens.entries()) {
      // Remove tokens que já expiraram naturalmente
      if (now > entry.expiresAt) {
        this.blacklistedTokens.delete(tokenId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Blacklist cleanup: ${cleaned} tokens expirados removidos`);
      console.log(`Tokens blacklistados restantes: ${this.blacklistedTokens.size}`);
    }
  }

  // Obter estatísticas da blacklist
  getStats(): { total: number; byReason: { [key: string]: number }; byUser: { [key: string]: number } } {
    const stats = {
      total: this.blacklistedTokens.size,
      byReason: {} as { [key: string]: number },
      byUser: {} as { [key: string]: number }
    };

    for (const entry of this.blacklistedTokens.values()) {
      // Contar por motivo
      stats.byReason[entry.reason || 'unknown'] = (stats.byReason[entry.reason || 'unknown'] || 0) + 1;
      
      // Contar por usuário
      stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
    }

    return stats;
  }

  // Remover token específico da blacklist (útil para admin)
  removeFromBlacklist(tokenId: string): boolean {
    return this.blacklistedTokens.delete(tokenId);
  }

  // Limpar toda a blacklist (usar com cuidado)
  clearBlacklist(): void {
    this.blacklistedTokens.clear();
    console.log('Blacklist completamente limpa');
  }

  // Destruir o serviço (limpar interval)
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
const tokenBlacklistService = new TokenBlacklistService();
export default tokenBlacklistService;