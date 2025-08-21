import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import AuthController from '../controllers/AuthController.js';
import AuthMiddleware from '../middleware/authMiddleware.js';

export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Instâncias dos controllers e middlewares
  const authController = new AuthController();
  const authMiddleware = new AuthMiddleware();

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

  // ========== ROTAS PÚBLICAS (não precisam de autenticação) ==========
  
  // POST /auth/login - Fazer login
  fastify.post('/login', { 
    schema: loginSchema 
  }, async (request, reply) => {
    return authController.login(request, reply);
  });

  // POST /auth/refresh - Renovar token
  fastify.post('/refresh', { 
    schema: refreshTokenSchema 
  }, async (request, reply) => {
    return authController.refreshToken(request, reply);
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