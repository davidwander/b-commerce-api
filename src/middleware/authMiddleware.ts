import { FastifyRequest, FastifyReply } from 'fastify';
import AuthService from '../services/AuthService.js';
import tokenBlacklistService from '../services/TokenBlackListService.js'

// Estender a interface do FastifyRequest para incluir dados do usuário
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
}

class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Middleware para verificar autenticação
  async authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH MIDDLEWARE: Verificando autenticação ===');

      // Buscar token no header Authorization
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.status(401).send({
          error: 'Token de acesso não fornecido',
          code: 'MISSING_TOKEN'
        });
      }

      // Verificar formato: "Bearer TOKEN"
      const token = authHeader.replace('Bearer ', '');
      
      if (!token || token === authHeader) {
        return reply.status(401).send({
          error: 'Formato de token inválido. Use: Bearer <token>',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }

      // Validar token
      const decoded = await this.authService.validateToken(token);
      
      if (!decoded) {
        return reply.status(401).send({
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        });
      }

      // Verificar se token está na blacklist
      const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
      
      if (isBlacklisted) {
        return reply.status(401).send({
          error: 'Token foi invalidado. Faça login novamente.',
          code: 'TOKEN_BLACKLISTED'
        });
      }

      // Adicionar dados do usuário à requisição
      request.userId = decoded.userId;
      request.userEmail = decoded.email;

      console.log('Usuário autenticado:', decoded.email);

      // Continuar para a próxima função
      return;

    } catch (error: unknown) {
      console.error('Erro no middleware de autenticação:', error);
      
      return reply.status(500).send({
        error: 'Erro interno de autenticação',
        code: 'AUTH_MIDDLEWARE_ERROR'
      });
    }
  }

  // Middleware opcional - permite acesso com ou sem autenticação
  async optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
    try {
      console.log('=== AUTH MIDDLEWARE: Autenticação opcional ===');

      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        console.log('Nenhum token fornecido - continuando sem autenticação');
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token || token === authHeader) {
        console.log('Formato de token inválido - continuando sem autenticação');
        return;
      }

      const decoded = await this.authService.validateToken(token);
      
      if (decoded) {
        request.userId = decoded.userId;
        request.userEmail = decoded.email;
        console.log('Usuário autenticado opcionalmente:', decoded.email);
      }

      return;

    } catch (error: unknown) {
      console.error('Erro no middleware de autenticação opcional:', error);
      // Em caso de erro, continua sem autenticação
      return;
    }
  }

  // Middleware para verificar se o usuário é admin (exemplo futuro)
  async requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Primeiro verifica se está autenticado
      await this.authenticate(request, reply);

      // Aqui você poderia verificar se o usuário tem permissão de admin
      // Por enquanto, vamos apenas verificar se está autenticado
      
      console.log('Verificação de admin passou para:', request.userEmail);
      return;

    } catch (error: unknown) {
      console.error('Erro na verificação de admin:', error);
      
      return reply.status(403).send({
        error: 'Acesso negado - permissões insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
  }
}

export default AuthMiddleware;