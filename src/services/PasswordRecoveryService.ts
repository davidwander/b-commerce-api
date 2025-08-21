import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prismaClient from '../prisma/index.js';
import PasswordValidationService from './PasswordValidationService.js';

// Interface para tokens de recuperação
interface RecoveryToken {
  token: string;
  email: string;
  expiresAt: number;
  createdAt: number;
  used: boolean;
}

// Classe para erros de recuperação
class RecoveryError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'RecoveryError';
    this.statusCode = statusCode;
  }
}

class PasswordRecoveryService {
  private recoveryTokens: Map<string, RecoveryToken> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private passwordValidator: PasswordValidationService;

  constructor() {
    this.passwordValidator = new PasswordValidationService();
    
    // Limpa tokens expirados a cada 30 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000);
  }

  // Solicitar recuperação de senha
  async requestPasswordReset(email: string): Promise<{ token: string; expiresIn: number }> {
    try {
      console.log('=== PASSWORD RECOVERY: Solicitação de reset ===');
      console.log('Email:', email);

      // Validar email
      if (!email || !this.isValidEmail(email)) {
        throw new RecoveryError('Email inválido', 400);
      }

      // Verificar se usuário existe
      const user = await prismaClient.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true }
      });

      if (!user) {
        // Por segurança, não revelar se o email existe ou não
        // Retorna sucesso mesmo se o usuário não existir
        console.log('Usuário não encontrado, mas retornando sucesso por segurança');
        
        return {
          token: 'fake-token-for-security',
          expiresIn: 15 * 60 * 1000 // 15 minutos
        };
      }

      // Invalidar tokens anteriores para este email
      this.invalidatePreviousTokens(email);

      // Gerar token de recuperação
      const token = this.generateRecoveryToken();
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutos
      
      const recoveryData: RecoveryToken = {
        token,
        email,
        expiresAt,
        createdAt: Date.now(),
        used: false
      };

      this.recoveryTokens.set(token, recoveryData);

      console.log(`Token de recuperação gerado para ${email}, expira em 15 minutos`);
      console.log(`Tokens ativos: ${this.recoveryTokens.size}`);

      // Em produção, aqui você enviaria um email com o token
      // Para desenvolvimento, vamos apenas logar
      console.log(`=== EMAIL DE RECUPERAÇÃO (DESENVOLVIMENTO) ===`);
      console.log(`Para: ${email}`);
      console.log(`Nome: ${user.name}`);
      console.log(`Token: ${token}`);
      console.log(`Link: http://localhost:3000/reset-password?token=${token}`);
      console.log(`Expira em: ${new Date(expiresAt).toLocaleString()}`);
      console.log(`==============================================`);

      return {
        token, // Em produção, NÃO retornar o token na response
        expiresIn: 15 * 60 * 1000
      };

    } catch (error: unknown) {
      console.error('Erro na solicitação de recuperação:', error);
      
      if (error instanceof RecoveryError) {
        throw error;
      }
      
      throw new RecoveryError('Erro interno no servidor', 500);
    }
  }

  // Verificar se token é válido
  async verifyRecoveryToken(token: string): Promise<{ valid: boolean; email?: string; expiresIn?: number }> {
    try {
      console.log('=== PASSWORD RECOVERY: Verificação de token ===');
      
      if (!token) {
        throw new RecoveryError('Token é obrigatório', 400);
      }

      const recoveryData = this.recoveryTokens.get(token);

      if (!recoveryData) {
        throw new RecoveryError('Token inválido ou expirado', 400);
      }

      const now = Date.now();

      // Verificar se token expirou
      if (now > recoveryData.expiresAt) {
        this.recoveryTokens.delete(token);
        throw new RecoveryError('Token expirado', 400);
      }

      // Verificar se token já foi usado
      if (recoveryData.used) {
        throw new RecoveryError('Token já foi utilizado', 400);
      }

      console.log(`Token válido para email: ${recoveryData.email}`);

      return {
        valid: true,
        email: recoveryData.email,
        expiresIn: recoveryData.expiresAt - now
      };

    } catch (error: unknown) {
      console.error('Erro na verificação do token:', error);
      
      if (error instanceof RecoveryError) {
        throw error;
      }

      return { valid: false };
    }
  }

  // Resetar senha usando token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      console.log('=== PASSWORD RECOVERY: Reset de senha ===');
      
      if (!token || !newPassword) {
        throw new RecoveryError('Token e nova senha são obrigatórios', 400);
      }

      // Verificar token
      const tokenData = await this.verifyRecoveryToken(token);
      
      if (!tokenData.valid || !tokenData.email) {
        throw new RecoveryError('Token inválido', 400);
      }

      // Validar nova senha
      const user = await prismaClient.user.findUnique({
        where: { email: tokenData.email },
        select: { name: true, email: true }
      });

      if (!user) {
        throw new RecoveryError('Usuário não encontrado', 404);
      }

      const personalInfo = [user.name, user.email.split('@')[0]];
      const passwordValidation = this.passwordValidator.validatePassword(
        newPassword, 
        { minLength: 8 }, 
        personalInfo
      );

      if (!passwordValidation.isValid) {
        const errorMessage = `Nova senha não atende aos critérios:\n${passwordValidation.errors.join('\n')}`;
        throw new RecoveryError(errorMessage, 400);
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha no banco
      await prismaClient.user.update({
        where: { email: tokenData.email },
        data: { 
          password: hashedPassword,
          // Opcional: atualizar timestamp de última alteração
          // updatedAt: new Date()
        }
      });

      // Marcar token como usado
      const recoveryData = this.recoveryTokens.get(token);
      if (recoveryData) {
        recoveryData.used = true;
        this.recoveryTokens.set(token, recoveryData);
      }

      console.log(`Senha resetada com sucesso para: ${tokenData.email}`);
      console.log(`Força da nova senha: ${passwordValidation.strength}`);

    } catch (error: unknown) {
      console.error('Erro no reset de senha:', error);
      
      if (error instanceof RecoveryError) {
        throw error;
      }
      
      throw new RecoveryError('Erro interno no servidor', 500);
    }
  }

  // Invalidar tokens anteriores de um email
  private invalidatePreviousTokens(email: string): void {
    let invalidated = 0;
    
    for (const [token, data] of this.recoveryTokens.entries()) {
      if (data.email === email && !data.used) {
        this.recoveryTokens.delete(token);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      console.log(`${invalidated} tokens anteriores invalidados para ${email}`);
    }
  }

  // Gerar token de recuperação criptograficamente seguro
  private generateRecoveryToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validar formato de email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  // Limpar tokens expirados
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, data] of this.recoveryTokens.entries()) {
      if (now > data.expiresAt || data.used) {
        this.recoveryTokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Recovery tokens cleanup: ${cleaned} tokens removidos`);
      console.log(`Tokens ativos restantes: ${this.recoveryTokens.size}`);
    }
  }

  // Obter estatísticas
  getStats(): { total: number; used: number; expired: number; active: number } {
    const now = Date.now();
    const stats = { total: 0, used: 0, expired: 0, active: 0 };

    for (const data of this.recoveryTokens.values()) {
      stats.total++;
      
      if (data.used) {
        stats.used++;
      } else if (now > data.expiresAt) {
        stats.expired++;
      } else {
        stats.active++;
      }
    }

    return stats;
  }

  // Destruir serviço (limpar interval)
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export default PasswordRecoveryService;
export { RecoveryError };