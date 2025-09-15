import { FastifyRequest, FastifyReply } from 'fastify';
import AuthService, { AuthError } from '../services/AuthService.js';
import tokenBlacklistService from '../services/TokenBlackListService.js';
import PasswordRecoveryService, { RecoveryError } from '../services/PasswordRecoveryService.js';

// Interfaces para tipagem das requisições
interface LoginBody {
  email: string;
  password: string;
}

interface RefreshTokenBody {
  refreshToken: string;
}

class AuthController {
  private authService: AuthService;
  private passwordRecoveryService: PasswordRecoveryService;

  constructor() {
    this.authService = new AuthService();
    this.passwordRecoveryService = new PasswordRecoveryService();
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Login ===');
      console.log('Request body:', request.body);

      const { email, password } = request.body as LoginBody;

      // Validação básica
      if (!email || !password) {
        return reply.status(400).send({
          error: 'Email e senha são obrigatórios',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const result = await this.authService.login(email, password);

      console.log('Login bem-sucedido para:', email);

      reply.status(200).send({
        message: 'Login realizado com sucesso',
        data: result
      });

    } catch (error: unknown) {
      console.error('Erro no controller de login:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Forgot Password ===');
      
      const { email } = request.body as { email: string };

      if (!email) {
        return reply.status(400).send({
          error: 'Email é obrigatório',
          code: 'MISSING_EMAIL'
        });
      }

      const result = await this.passwordRecoveryService.requestPasswordReset(email);

      // Por segurança, sempre retornar sucesso
      reply.status(200).send({
        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha',
        data: {
          // Em produção, NÃO retornar o token
          ...(process.env.NODE_ENV === 'development' ? { token: result.token } : {}),
          expiresIn: '15 minutos'
        }
      });

    } catch (error: unknown) {
      console.error('Erro no forgot password:', error);

      if (error instanceof RecoveryError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'RECOVERY_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Reset Password ===');
      
      const { token, newPassword } = request.body as { token: string; newPassword: string };

      if (!token || !newPassword) {
        return reply.status(400).send({
          error: 'Token e nova senha são obrigatórios',
          code: 'MISSING_FIELDS'
        });
      }

      await this.passwordRecoveryService.resetPassword(token, newPassword);

      reply.status(200).send({
        message: 'Senha redefinida com sucesso. Você pode fazer login com a nova senha.',
        data: null
      });

    } catch (error: unknown) {
      console.error('Erro no reset password:', error);

      if (error instanceof RecoveryError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'RECOVERY_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async verifyResetToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Verify Reset Token ===');
      
      const { token } = request.params as { token: string };

      if (!token) {
        return reply.status(400).send({
          error: 'Token é obrigatório',
          code: 'MISSING_TOKEN'
        });
      }

      const result = await this.passwordRecoveryService.verifyRecoveryToken(token);

      if (!result.valid) {
        return reply.status(400).send({
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        });
      }

      reply.status(200).send({
        message: 'Token válido',
        data: {
          valid: true,
          expiresIn: Math.ceil((result.expiresIn || 0) / 1000) 
        }
      });

    } catch (error: unknown) {
      console.error('Erro na verificação do token:', error);

      if (error instanceof RecoveryError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'RECOVERY_ERROR'
        });
      }

      reply.status(400).send({
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Refresh Token ===');
      
      const { refreshToken } = request.body as RefreshTokenBody;

      if (!refreshToken) {
        return reply.status(400).send({
          error: 'Refresh token é obrigatório',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken);

      reply.status(200).send({
        message: 'Token renovado com sucesso',
        data: tokens
      });

    } catch (error: unknown) {
      console.error('Erro ao renovar token:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async profile(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Profile ===');
      
      // O userId será injetado pelo middleware de autenticação
      const userId = (request as any).userId;

      if (!userId) {
        return reply.status(401).send({
          error: 'Token de acesso necessário',
          code: 'UNAUTHORIZED'
        });
      }

      const user = await this.authService.getUserById(userId);

      reply.status(200).send({
        message: 'Perfil do usuário',
        data: user
      });

    } catch (error: unknown) {
      console.error('Erro ao buscar perfil:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Logout ===');
      
      // Extrair token do header
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.status(400).send({
          error: 'Token de acesso necessário para logout',
          code: 'MISSING_TOKEN'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token || token === authHeader) {
        return reply.status(400).send({
          error: 'Formato de token inválido',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }

      // Adicionar token à blacklist
      await tokenBlacklistService.blacklistToken(token, 'logout');
      
      const userId = (request as any).userId;
      console.log(`Logout realizado para usuário: ${userId}`);
      
      reply.status(200).send({
        message: 'Logout realizado com sucesso',
        data: null
      });

    } catch (error: unknown) {
      console.error('Erro no logout:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}

export default AuthController;