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
      console.log('🔐 === AUTH MIDDLEWARE: Verificando autenticação ===');
      console.log('🌐 Rota:', request.method, request.url);
      console.log('🕐 Timestamp:', new Date().toISOString());

      // Log dos headers (sem mostrar valores sensíveis)
      console.log('📋 Headers recebidos:', {
        'user-agent': request.headers['user-agent']?.substring(0, 50) + '...',
        'content-type': request.headers['content-type'],
        'content-length': request.headers['content-length'],
        'host': request.headers.host,
        'authorization': request.headers.authorization ? 'PRESENTE' : 'AUSENTE'
      });

      // Buscar token no header Authorization
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        console.log('❌ AUTH MIDDLEWARE: Header Authorization não encontrado');
        return reply.status(401).send({
          error: 'Token de acesso não fornecido',
          code: 'MISSING_TOKEN'
        });
      }

      console.log('🔑 AUTH MIDDLEWARE: Authorization header presente');
      console.log('🔍 AUTH MIDDLEWARE: Header format:', authHeader.substring(0, 20) + '...');

      // Verificar formato: "Bearer TOKEN"
      if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ AUTH MIDDLEWARE: Formato inválido - não começa com "Bearer "');
        return reply.status(401).send({
          error: 'Formato de token inválido. Use: Bearer <token>',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        console.log('❌ AUTH MIDDLEWARE: Token vazio após remover "Bearer "');
        return reply.status(401).send({
          error: 'Token vazio',
          code: 'EMPTY_TOKEN'
        });
      }

      console.log('✅ AUTH MIDDLEWARE: Token extraído com sucesso');
      console.log('🔍 AUTH MIDDLEWARE: Token (primeiros 30 chars):', token.substring(0, 30) + '...');
      console.log('🔍 AUTH MIDDLEWARE: Token length:', token.length);

      // Validar token
      console.log('🔓 AUTH MIDDLEWARE: Iniciando validação do token...');
      const decoded = await this.authService.validateToken(token);
      
      if (!decoded) {
        console.log('❌ AUTH MIDDLEWARE: Token inválido ou expirado');
        return reply.status(401).send({
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        });
      }

      console.log('✅ AUTH MIDDLEWARE: Token válido');
      console.log('📋 AUTH MIDDLEWARE: Dados do token:', {
        userId: decoded.userId,
        email: decoded.email,
        iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'N/A',
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A'
      });

      // Verificar se token está na blacklist
      console.log('🔍 AUTH MIDDLEWARE: Verificando blacklist...');
      const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
      
      if (isBlacklisted) {
        console.log('❌ AUTH MIDDLEWARE: Token está na blacklist');
        return reply.status(401).send({
          error: 'Token foi invalidado. Faça login novamente.',
          code: 'TOKEN_BLACKLISTED'
        });
      }

      console.log('✅ AUTH MIDDLEWARE: Token não está na blacklist');

      // Adicionar dados do usuário à requisição
      request.userId = decoded.userId;
      request.userEmail = decoded.email;

      console.log('✅ AUTH MIDDLEWARE: Usuário autenticado com sucesso:', decoded.email);
      console.log('🔐 === FIM AUTH MIDDLEWARE - SUCESSO ===');

      // Continuar para a próxima função
      return;

    } catch (error: unknown) {
      console.error('❌ AUTH MIDDLEWARE: Erro durante autenticação:', error);
      
      // Log mais detalhado do erro
      if (error instanceof Error) {
        console.error('❌ AUTH MIDDLEWARE: Nome do erro:', error.name);
        console.error('❌ AUTH MIDDLEWARE: Mensagem:', error.message);
        console.error('❌ AUTH MIDDLEWARE: Stack:', error.stack);
      }
      
      return reply.status(500).send({
        error: 'Erro interno de autenticação',
        code: 'AUTH_MIDDLEWARE_ERROR',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Erro desconhecido') : undefined
      });
    }
  }

  // Middleware opcional - permite acesso com ou sem autenticação
  async optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
    try {
      console.log('🔓 === AUTH MIDDLEWARE: Autenticação opcional ===');

      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        console.log('ℹ️ AUTH MIDDLEWARE: Nenhum token fornecido - continuando sem autenticação');
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token || token === authHeader) {
        console.log('ℹ️ AUTH MIDDLEWARE: Formato de token inválido - continuando sem autenticação');
        return;
      }

      console.log('🔍 AUTH MIDDLEWARE: Tentando validar token opcional...');
      const decoded = await this.authService.validateToken(token);
      
      if (decoded) {
        request.userId = decoded.userId;
        request.userEmail = decoded.email;
        console.log('✅ AUTH MIDDLEWARE: Usuário autenticado opcionalmente:', decoded.email);
      } else {
        console.log('ℹ️ AUTH MIDDLEWARE: Token inválido - continuando sem autenticação');
      }

      return;

    } catch (error: unknown) {
      console.error('❌ AUTH MIDDLEWARE: Erro na autenticação opcional:', error);
      // Em caso de erro, continua sem autenticação
      return;
    }
  }

  // Middleware para verificar se o usuário é admin (exemplo futuro)
  async requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('🔒 === AUTH MIDDLEWARE: Verificação de admin ===');
      
      // Primeiro verifica se está autenticado
      await this.authenticate(request, reply);

      // Aqui você poderia verificar se o usuário tem permissão de admin
      // Por enquanto, vamos apenas verificar se está autenticado
      
      console.log('✅ AUTH MIDDLEWARE: Verificação de admin passou para:', request.userEmail);
      return;

    } catch (error: unknown) {
      console.error('❌ AUTH MIDDLEWARE: Erro na verificação de admin:', error);
      
      return reply.status(403).send({
        error: 'Acesso negado - permissões insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Erro desconhecido') : undefined
      });
    }
  }

  // Método auxiliar para debug - use apenas em desenvolvimento
  async debugTokenInfo(token: string) {
    try {
      console.log('🔍 === DEBUG TOKEN INFO ===');
      console.log('🔑 Token length:', token.length);
      console.log('🔑 Token (primeiros 50 chars):', token.substring(0, 50) + '...');
      
      // Tentar decodificar o payload (sem verificar assinatura)
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log('📋 Payload do token:', {
            userId: payload.userId,
            email: payload.email,
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A',
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
            expirado: payload.exp ? new Date(payload.exp * 1000) < new Date() : 'N/A',
            tempoRestante: payload.exp ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000)) + 's' : 'N/A'
          });
        } catch (e) {
          console.log('❌ Erro ao decodificar payload:', e);
        }
      } else {
        console.log('❌ Token não tem formato JWT válido (não tem 3 partes)');
      }

      // Tentar validar com o serviço
      console.log('🔓 Testando validação com AuthService...');
      const decoded = await this.authService.validateToken(token);
      console.log('✅ Validação do AuthService:', decoded ? 'VÁLIDO' : 'INVÁLIDO');
      if (decoded) {
        console.log('👤 Dados validados:', { userId: decoded.userId, email: decoded.email });
      }

      // Verificar blacklist
      console.log('📝 Verificando blacklist...');
      const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
      console.log('📝 Token na blacklist:', isBlacklisted ? 'SIM' : 'NÃO');

      console.log('🔍 === FIM DEBUG TOKEN INFO ===');

    } catch (error) {
      console.error('❌ Erro no debug do token:', error);
    }
  }
}

export default AuthMiddleware;