import { FastifyRequest, FastifyReply } from 'fastify';
import AuthService, { AuthError } from '../services/AuthService.js';

// Interfaces para tipagem das requisições
interface LoginBody {
  email: string;
  password: string;
}

interface RefreshTokenBody {
  refreshToken: string;
}

class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Login ===');
      console.log('Request body:', request.body);

      const { email, password } = request.body as LoginBody;

      // Validação básica
      if (!email || !password) {
        return reply.status(400).send({
          error: 'Email e senha são obrigatórios',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const result = await this.authService.login(email, password);

      console.log('Login bem-sucedido para:', email);

      reply.status(200).send({
        message: 'Login realizado com sucesso',
        data: result
      });

    } catch (error: unknown) {
      console.error('Erro no controller de login:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Refresh Token ===');
      
      const { refreshToken } = request.body as RefreshTokenBody;

      if (!refreshToken) {
        return reply.status(400).send({
          error: 'Refresh token é obrigatório',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken);

      reply.status(200).send({
        message: 'Token renovado com sucesso',
        data: tokens
      });

    } catch (error: unknown) {
      console.error('Erro ao renovar token:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async profile(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Profile ===');
      
      // O userId será injetado pelo middleware de autenticação
      const userId = (request as any).userId;

      if (!userId) {
        return reply.status(401).send({
          error: 'Token de acesso necessário',
          code: 'UNAUTHORIZED'
        });
      }

      const user = await this.authService.getUserById(userId);

      reply.status(200).send({
        message: 'Perfil do usuário',
        data: user
      });

    } catch (error: unknown) {
      console.error('Erro ao buscar perfil:', error);

      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          error: error.message,
          code: 'AUTH_ERROR'
        });
      }

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('=== AUTH CONTROLLER: Logout ===');
      
      // Em uma implementação completa, você poderia invalidar o token
      // adicionando-o a uma blacklist no Redis ou banco de dados
      
      reply.status(200).send({
        message: 'Logout realizado com sucesso',
        data: null
      });

    } catch (error: unknown) {
      console.error('Erro no logout:', error);

      reply.status(500).send({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}

export default AuthController;