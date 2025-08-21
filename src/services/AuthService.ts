import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prismaClient from '../prisma/index.js';

// Classe customizada para erros de autenticação
class AuthError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
  refreshToken: string;
}

interface TokenPayload {
  userId: string;
  email: string;
}

class AuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private tokenExpiration: string;
  private refreshTokenExpiration: string;

  constructor() {
    // Em produção, usar variáveis de ambiente
    this.jwtSecret = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'sua-chave-refresh-super-segura';
    this.tokenExpiration = process.env.JWT_EXPIRATION || '15m'; // 15 minutos
    this.refreshTokenExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d'; // 7 dias
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('=== AUTH SERVICE: Login iniciado ===');
      console.log('Email:', email);

      // Validações básicas
      if (!email || !password) {
        throw new AuthError('Email e senha são obrigatórios', 400);
      }

      // Buscar usuário no banco
      const user = await prismaClient.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
        }
      });

      if (!user) {
        throw new AuthError('Credenciais inválidas', 401);
      }

      // Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new AuthError('Credenciais inválidas', 401);
      }

      // Gerar tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.tokenExpiration
      });

      const refreshToken = jwt.sign(tokenPayload, this.jwtRefreshSecret, {
        expiresIn: this.refreshTokenExpiration
      });

      console.log('Login realizado com sucesso para:', email);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token,
        refreshToken
      };

    } catch (error: unknown) {
      console.error('Erro no login:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError('Erro interno no servidor', 500);
    }
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error: unknown) {
      console.error('Token inválido:', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as TokenPayload;

      // Verificar se usuário ainda existe
      const user = await prismaClient.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true }
      });

      if (!user) {
        throw new AuthError('Usuário não encontrado', 401);
      }

      // Gerar novos tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email
      };

      const newToken = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.tokenExpiration
      });

      const newRefreshToken = jwt.sign(tokenPayload, this.jwtRefreshSecret, {
        expiresIn: this.refreshTokenExpiration
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };

    } catch (error: unknown) {
      console.error('Erro ao renovar token:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Token inválido', 401);
      }

      throw new AuthError('Erro interno no servidor', 500);
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new AuthError('Usuário não encontrado', 404);
      }

      return user;
    } catch (error: unknown) {
      console.error('Erro ao buscar usuário:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError('Erro interno no servidor', 500);
    }
  }
}

export default AuthService;
export { AuthError };