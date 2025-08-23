import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import AuthController from '../controllers/AuthController.js';
import RateLimitMiddleware from '../middleware/rateLimitMiddleware.js';

// Definindo o tipo para o corpo da requisição de refresh token
interface RefreshTokenBody {
  refreshToken: string;
}

export async function authRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const authController = new AuthController();
  const rateLimitMiddleware = new RateLimitMiddleware();

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

  fastify.post('/login', {
    schema: loginSchema,
    preHandler: [rateLimitMiddleware.loginRateLimit(5, 15 * 60 * 1000)]
  }, async (request, reply) => {
    return authController.login(request, reply);
  });

  fastify.post<{ Body: RefreshTokenBody }>('/refresh-token', async (request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token é obrigatório' });
    }

    try {
      const newTokens = await authController.refreshToken(request, reply); // Correção: Passando request e reply
      return reply.send(newTokens);
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      return reply.status(500).send({ error: 'Erro ao renovar token' });
    }
  });
}