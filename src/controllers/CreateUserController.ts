import { FastifyRequest, FastifyReply } from 'fastify';
import CreateUserService, { BusinessError } from '../services/CreateUserService.js';

// Tipagem para o body da requisição
interface CreateUserBody {
  name: string;
  email: string;
  password: string;
}

class CreateUserController {
  async handle(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== DEBUG: Início do handle ===');
      console.log('Request body:', request.body);
      
      // Extrai os dados do body da requisição com type assertion
      const { name, email, password } = request.body as CreateUserBody;
      
      console.log('Dados extraídos:', { name, email, password });

      // Validação básica (campos obrigatórios)
      if (!name || !email || !password) {
        console.log('Erro de validação: campos obrigatórios ausentes');
        return reply.status(400).send({
          error: 'Nome, email e senha são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      console.log('Validação passou, criando instância do service');
      const userService = new CreateUserService();
      
      console.log('Executando service...');
      const user = await userService.execute({ name, email, password });
      
      console.log('Usuário criado com sucesso:', user);
      
      reply.status(201).send({
        message: 'Usuário criado com sucesso',
        data: user
      });
    } catch (error: unknown) {
      console.error('=== ERRO DETALHADO ===');
      console.error('Erro completo:', error);
      
      // Tratamento para erros de negócio
      if (error instanceof BusinessError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'BUSINESS_ERROR'
        });
      }
      
      // Tratamento para erros de validação do Fastify
      if (this.isFastifyValidationError(error)) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.validation,
          code: 'VALIDATION_ERROR'
        });
      }
      
      // Erro genérico (não deveria chegar aqui se o service estiver bem implementado)
      console.error('Erro não tratado:', error);
      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  // Type guard para erros de validação do Fastify
  private isFastifyValidationError(error: unknown): error is { validation: any } {
    return typeof error === 'object' && error !== null && 'validation' in error;
  }
}

export default CreateUserController;