import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import CreateUserController from './controllers/CreateUserController.js';
import { authRoutes } from './routes/authRoutes.js';

// 🔥 IMPORTAR AS NOVAS ROTAS DE ESTOQUE
import inventoryRoutes from './routes/inventory.js';
// 🔥 IMPORTAR AS NOVAS ROTAS DE VENDAS
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
  fastify.register(authRoutes, { prefix: '/auth' });
  
  // 🔥 REGISTRAR AS ROTAS DO ESTOQUE
  await fastify.register(inventoryRoutes, { prefix: '/api/inventory' });
  
  // 🔥 REGISTRAR AS ROTAS DE VENDAS
  await fastify.register(salesRoutes, { prefix: '/api/sales' });
}
