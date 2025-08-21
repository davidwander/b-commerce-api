import prismaClient from '../prisma/index.js';
import bcrypt from 'bcrypt';
import PasswordValidationService from './PasswordValidationService.js';

// Classe customizada para erros de negócio
class BusinessError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
  }
}

class CreateUserService {
  private passwordValidator: PasswordValidationService;

  constructor() {
    this.passwordValidator = new PasswordValidationService();
  }
  async execute(userData: { name: string; email: string; password: string }) {
    console.log("=== DEBUG SERVICE: ROTA CHAMADA ===");
    console.log('Dados recebidos no service:', userData);
    
    try {
      // Validações de negócio
      await this.validateUserData(userData);
      
      console.log('Tentando conectar com o banco...');
      
      // Hash da senha antes de salvar
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Criar usuário no banco
      const user = await prismaClient.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
        },
        // Não retorna a senha na resposta
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        }
      });

      console.log('Usuário criado no banco:', user);
      return user;
    } catch (error: unknown) {
      console.error('Erro no service:', error);
      
      // Tratamento específico para erros do Prisma
      if (this.isPrismaError(error)) {
        if (error.code === 'P2002') {
          // Erro de constraint única (email já existe)
          throw new BusinessError('Email já está em uso', 409);
        }
        
        if (error.code === 'P2003') {
          // Erro de foreign key
          throw new BusinessError('Erro de referência no banco de dados', 400);
        }
        
        if (error.code === 'P2025') {
          // Registro não encontrado
          throw new BusinessError('Registro não encontrado', 404);
        }
        
        // Erro de conexão com banco
        if (error.code === 'P1001') {
          throw new BusinessError('Erro de conexão com o banco de dados', 500);
        }
      }
      
      // Se for um erro de negócio, apenas re-lança
      if (error instanceof BusinessError) {
        throw error;
      }
      
      // Para outros erros, lança um erro genérico
      throw new BusinessError('Erro interno do servidor', 500);
    }
  }
  
  private async validateUserData(userData: { name: string; email: string; password: string }) {
    // Validação de nome
    if (!userData.name || userData.name.trim().length < 2) {
      throw new BusinessError('Nome deve ter pelo menos 2 caracteres', 400);
    }
    
    if (userData.name.length > 100) {
      throw new BusinessError('Nome deve ter no máximo 100 caracteres', 400);
    }
    
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userData.email || !emailRegex.test(userData.email)) {
      throw new BusinessError('Email deve ter um formato válido', 400);
    }
    
    if (userData.email.length > 255) {
      throw new BusinessError('Email deve ter no máximo 255 caracteres', 400);
    }
    
    // Validação de senha forte
    const personalInfo = [userData.name, userData.email.split('@')[0]];
    const passwordValidation = this.passwordValidator.validatePassword(userData.password, {}, personalInfo);
    
    if (!passwordValidation.isValid) {
      const errorMessage = `Senha não atende aos critérios de segurança:\n${passwordValidation.errors.join('\n')}`;
      throw new BusinessError(errorMessage, 400);
    }
    
    // Log da força da senha (sem expor a senha)
    console.log(`Senha validada - Força: ${passwordValidation.strength}, Score: ${passwordValidation.score}`);
    
    // Verificar se email já existe (opcional - também será capturado pelo erro P2002)
    const existingUser = await prismaClient.user.findUnique({
      where: { email: userData.email }
    });
    
    if (existingUser) {
      throw new BusinessError('Email já está cadastrado', 409);
    }
  }
  
  // Type guard para erros do Prisma
  private isPrismaError(error: unknown): error is { code: string; message: string } {
    return typeof error === 'object' && 
           error !== null && 
           'code' in error && 
           'message' in error &&
           typeof (error as any).code === 'string';
  }
}

export default CreateUserService;
export { BusinessError };