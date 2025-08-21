interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

interface PasswordCriteria {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  forbidCommonPasswords?: boolean;
  forbidPersonalInfo?: boolean;
}

class PasswordValidationService {
  private commonPasswords: Set<string>;

  constructor() {
    // Lista de senhas comuns (em produção, usar uma lista mais completa)
    this.commonPasswords = new Set([
      '123456', 'password', '123456789', '12345678', '12345',
      '1234567', '1234567890', 'qwerty', 'abc123', 'million',
      '000000', '1234', 'iloveyou', 'aaron431', 'password1',
      'qqww1122', '123', 'omgpop', '123321', '654321',
      'admin', 'root', 'user', 'guest', 'test', 'demo'
    ]);
  }

  // Validação principal da senha
  validatePassword(
    password: string, 
    criteria: PasswordCriteria = {},
    personalInfo: string[] = []
  ): PasswordValidationResult {
    
    const defaultCriteria: PasswordCriteria = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      forbidCommonPasswords: true,
      forbidPersonalInfo: true,
      ...criteria
    };

    const errors: string[] = [];
    let score = 0;

    console.log('=== PASSWORD VALIDATION ===');

    // 1. Verificar comprimento mínimo
    if (password.length < (defaultCriteria.minLength || 8)) {
      errors.push(`Senha deve ter pelo menos ${defaultCriteria.minLength} caracteres`);
    } else {
      score += 1;
      if (password.length >= 12) score += 1; // Bônus por senha longa
    }

    // 2. Verificar letras maiúsculas
    if (defaultCriteria.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    } else if (/[A-Z]/.test(password)) {
      score += 1;
    }

    // 3. Verificar letras minúsculas
    if (defaultCriteria.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    } else if (/[a-z]/.test(password)) {
      score += 1;
    }

    // 4. Verificar números
    if (defaultCriteria.requireNumbers && !/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    } else if (/\d/.test(password)) {
      score += 1;
    }

    // 5. Verificar caracteres especiais
    if (defaultCriteria.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    }

    // 6. Verificar senhas comuns
    if (defaultCriteria.forbidCommonPasswords && this.isCommonPassword(password)) {
      errors.push('Esta senha é muito comum e fácil de adivinhar');
    } else {
      score += 1;
    }

    // 7. Verificar informações pessoais
    if (defaultCriteria.forbidPersonalInfo && this.containsPersonalInfo(password, personalInfo)) {
      errors.push('Senha não deve conter informações pessoais');
    } else {
      score += 1;
    }

    // 8. Verificar padrões repetitivos
    if (this.hasRepetitivePatterns(password)) {
      errors.push('Senha contém padrões muito repetitivos');
    } else {
      score += 1;
    }

    // 9. Verificar sequências
    if (this.hasSequentialCharacters(password)) {
      errors.push('Senha contém sequências muito óbvias (123, abc, etc.)');
    } else {
      score += 1;
    }

    // Calcular força da senha
    const strength = this.calculateStrength(score, password);
    const isValid = errors.length === 0;

    const result: PasswordValidationResult = {
      isValid,
      errors,
      strength,
      score
    };

    console.log(`Senha validada - Score: ${score}/9, Força: ${strength}, Válida: ${isValid}`);
    if (errors.length > 0) {
      console.log('Erros encontrados:', errors);
    }

    return result;
  }

  // Verificar se é uma senha comum
  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password.toLowerCase());
  }

  // Verificar informações pessoais na senha
  private containsPersonalInfo(password: string, personalInfo: string[]): boolean {
    const lowerPassword = password.toLowerCase();
    
    return personalInfo.some(info => {
      if (info.length < 3) return false; // Ignorar informações muito curtas
      return lowerPassword.includes(info.toLowerCase());
    });
  }

  // Verificar padrões repetitivos (ex: 1111, aaaa)
  private hasRepetitivePatterns(password: string): boolean {
    // Verificar 3+ caracteres iguais consecutivos
    if (/(.)\1{2,}/.test(password)) {
      return true;
    }

    // Verificar padrões como 1212, abab
    for (let i = 0; i < password.length - 3; i++) {
      const pattern = password.substr(i, 2);
      if (password.substr(i + 2, 2) === pattern) {
        return true;
      }
    }

    return false;
  }

  // Verificar sequências (123, abc, qwerty)
  private hasSequentialCharacters(password: string): boolean {
    const sequences = [
      '0123456789',
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];

    const lowerPassword = password.toLowerCase();

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substr(i, 3);
        const reverseSubseq = subseq.split('').reverse().join('');
        
        if (lowerPassword.includes(subseq) || lowerPassword.includes(reverseSubseq)) {
          return true;
        }
      }
    }

    return false;
  }

  // Calcular força da senha baseada no score
  private calculateStrength(score: number, password: string): 'weak' | 'medium' | 'strong' | 'very-strong' {
    // Bônus adicional por comprimento
    let adjustedScore = score;
    if (password.length >= 16) adjustedScore += 1;
    if (password.length >= 20) adjustedScore += 1;

    if (adjustedScore >= 8) return 'very-strong';
    if (adjustedScore >= 6) return 'strong';
    if (adjustedScore >= 4) return 'medium';
    return 'weak';
  }

  // Gerar sugestões para melhorar a senha
  generatePasswordSuggestions(): string[] {
    return [
      'Use pelo menos 12 caracteres',
      'Combine letras maiúsculas e minúsculas',
      'Inclua números e símbolos',
      'Evite palavras do dicionário',
      'Não use informações pessoais',
      'Use frases secretas (ex: "MeuGato#Tem9Vidas!")',
      'Considere usar um gerenciador de senhas'
    ];
  }

  // Gerar uma senha forte aleatória
  generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';

    // Garantir pelo menos um de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Preencher o restante aleatoriamente
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Embaralhar os caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

export default PasswordValidationService;