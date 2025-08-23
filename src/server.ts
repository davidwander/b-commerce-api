import Fastify from 'fastify';
import { routes } from './routes.js';
import cors from '@fastify/cors';

const app = Fastify({ logger: true })

const start = async () => {
  // Configurar CORS para aceitar qualquer origem
  await app.register(cors, {
    origin: true, // Permite qualquer origem
    credentials: true
  });
  
  // 🔥 REGISTRAR JWT PLUGIN (necessário para as rotas de estoque)
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura'
  });
  
  await app.register(routes);

  try {
    // Adicionar host: '0.0.0.0' para aceitar conexões externas
    await app.listen({ 
      port: 3333, 
      host: '0.0.0.0'
    });
    
    console.log("🚀 Servidor funcionando em:");
    console.log("📱 Localhost: http://localhost:3333");
    console.log("🌐 Rede local: http://SEU_IP:3333");
    console.log("📦 Estoque API: http://localhost:3333/api/inventory/");
    
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
  }
}

start();

