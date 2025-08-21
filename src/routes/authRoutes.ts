import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import AuthController from '../controllers/AuthController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
import RateLimitMiddleware from '../middleware/rateLimitMiddleware.js';

export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Instâncias dos controllers e middlewares
  const authController = new AuthController();
  const authMiddleware = new AuthMiddleware();
  const rateLimitMiddleware = new RateLimitMiddleware();

  // Schemas para validação (opcional, mas recomendado)
  const loginSchema = {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          minLength: 3,
          maxLength: 255
        },
        password: { 
          type: 'string', 
          minLength: 6,
          maxLength: 100
        }
      }
    }
  };

  const refreshTokenSchema = {
    body: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { 
          type: 'string',
          minLength: 10
        }
      }
    }
  };

  const forgotPasswordSchema = {
    body: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          maxLength: 255
        }
      }
    }
  };

  const resetPasswordSchema = {
    body: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: { 
          type: 'string',
          minLength: 10
        },
        newPassword: { 
          type: 'string',
          minLength: 8,
          maxLength: 100
        }
      }
    }
  };

  // ========== ROTAS PÚBLICAS (não precisam de autenticação) ==========
  
  // POST /auth/login - Fazer login (com rate limiting restritivo)
  fastify.post('/login', { 
    schema: loginSchema,
    preHandler: [rateLimitMiddleware.loginRateLimit(5, 15 * 60 * 1000)] // 5 tentativas por 15 min
  }, async (request, reply) => {
    return authController.login(request, reply);
  });

  // POST /auth/refresh - Renovar token (com rate limiting moderado)
  fastify.post('/refresh', { 
    schema: refreshTokenSchema,
    preHandler: [rateLimitMiddleware.generalRateLimit(10, 15 * 60 * 1000)] // 10 tentativas por 15 min
  }, async (request, reply) => {
    return authController.refreshToken(request, reply);
  });

  // POST /auth/forgot-password - Solicitar reset de senha
  fastify.post('/forgot-password', {
    schema: forgotPasswordSchema,
    preHandler: [rateLimitMiddleware.forgotPasswordRateLimit(3, 60 * 60 * 1000)] // 3 tentativas por hora
  }, async (request, reply) => {
    return authController.forgotPassword(request, reply);
  });

  // GET /auth/reset-token/:token - Verificar se token de reset é válido
  fastify.get('/reset-token/:token', async (request, reply) => {
    return authController.verifyResetToken(request, reply);
  });

  // POST /auth/reset-password - Redefinir senha
  fastify.post('/reset-password', {
    schema: resetPasswordSchema,
    preHandler: [rateLimitMiddleware.generalRateLimit(5, 15 * 60 * 1000)] // 5 tentativas por 15 min
  }, async (request, reply) => {
    return authController.resetPassword(request, reply);
  });

  // ========== ROTAS PROTEGIDAS (precisam de autenticação) ==========
  
  // GET /auth/profile - Buscar perfil do usuário logado
  fastify.get('/profile', {
    preHandler: [authMiddleware.authenticate.bind(authMiddleware)]
  }, async (request, reply) => {
    return authController.profile(request, reply);
  });

  // POST /auth/logout - Fazer logout
  fastify.post('/logout', {
    preHandler: [authMiddleware.authenticate.bind(authMiddleware)]
  }, async (request, reply) => {
    return authController.logout(request, reply);
  });

  // ========== ROTA DE TESTE (opcional) ==========
  
  // GET /auth/test-protected - Testar se a autenticação está funcionando
  fastify.get('/test-protected', {
    preHandler: [authMiddleware.authenticate.bind(authMiddleware)]
  }, async (request, reply) => {
    return reply.send({
      message: 'Rota protegida acessada com sucesso!',
      user: {
        id: request.userId,
        email: request.userEmail
      }
    });
  });

  // GET /auth/test-optional - Testar autenticação opcional
  fastify.get('/test-optional', {
    preHandler: [authMiddleware.optionalAuth.bind(authMiddleware)]
  }, async (request, reply) => {
    return reply.send({
      message: 'Rota com autenticação opcional',
      authenticated: !!request.userId,
      user: request.userId ? {
        id: request.userId,
        email: request.userEmail
      } : null
    });
  });
}