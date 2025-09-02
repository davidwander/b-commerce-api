import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import CreateUserController from './controllers/CreateUserController.js';
import { authRoutes } from './routes/authRoutes.js';

// Importar as rotas de estoque e vendas
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';

export async function routes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Rota de teste básico
  fastify.get("/teste", async (_request: FastifyRequest, _reply: FastifyReply) => {
    return { ok: true };
  });

  // Instância do controller
  const createUserController = new CreateUserController();

  // Rota para criar usuário (registro)
  fastify.post("/user", async (request: FastifyRequest, reply: FastifyReply) => {
    return createUserController.handle(request, reply);
  });

  // Registrar rotas de autenticação com prefixo /auth
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // Registrar as rotas do estoque (COM MIDDLEWARE AUTOMÁTICO)
  await fastify.register(inventoryRoutes, { prefix: '/api/inventory' });
  
  // Registrar as rotas de vendas (COM MIDDLEWARE AUTOMÁTICO) 
  await fastify.register(salesRoutes, { prefix: '/api/sales' });
}