import { FastifyRequest, FastifyReply } from 'fastify';

export default async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    console.log('🔐 === MIDDLEWARE DE AUTENTICAÇÃO ===');
    console.log('📋 Headers recebidos:', Object.keys(request.headers));
    
    const authHeader = request.headers.authorization;
    console.log('🔑 Auth header:', authHeader ? 'PRESENTE' : 'AUSENTE');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token não fornecido ou formato inválido');
      return reply.status(401).send({
        error: 'Token de acesso não fornecido ou formato inválido.'
      });
    }

    const token = authHeader.substring(7);
    console.log('🎯 Token extraído (primeiros 20 chars):', token.substring(0, 20) + '...');
    
    if (!token) {
      console.log('❌ Token vazio após extração');
      return reply.status(401).send({
        error: 'Token de acesso não fornecido.'
      });
    }

    // Verificar e decodificar o token JWT usando o método do Fastify
    try {
      console.log('🔍 Verificando JWT...');
      
      // Usar o método jwtVerify do Fastify que já está registrado
      const decoded = await request.jwtVerify();
      console.log('✅ Token decodificado:', decoded);
      
      // Extrair o userId do payload decodificado
      const userId = (decoded as any).userId;
      
      if (!userId) {
        console.log('❌ userId não encontrado no token decodificado');
        return reply.status(401).send({
          error: 'Token inválido: ID do usuário não encontrado.'
        });
      }
      
      // Adicionar o userId ao request para uso nos controllers
      (request as any).userId = userId;
      console.log('✅ Token válido para usuário:', userId);
      
    } catch (jwtError) {
      console.error('❌ Erro ao verificar JWT:', jwtError);
      return reply.status(401).send({
        error: 'Token inválido ou expirado.'
      });
    }

    console.log('✅ MIDDLEWARE: Autenticação bem-sucedida');
    
  } catch (error) {
    console.error('💥 Erro no middleware de autenticação:', error);
    return reply.status(500).send({
      error: 'Erro interno no servidor de autenticação.'
    });
  }
}