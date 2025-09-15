import { FastifyRequest, FastifyReply } from 'fastify';

// Interface para controle de tentativas
interface RateLimitData {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class RateLimitMiddleware {
  private attempts: Map<string, RateLimitData> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpa dados antigos a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Rate limit para login (mais restritivo)
  loginRateLimit(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip;
      const key = `login:${ip}`;
      
      return this.checkRateLimit(key, maxAttempts, windowMs, request, reply);
    };
  }

  // Rate limit geral para APIs
  generalRateLimit(maxAttempts: number = 100, windowMs: number = 15 * 60 * 1000) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip;
      const key = `general:${ip}`;
      
      return this.checkRateLimit(key, maxAttempts, windowMs, request, reply);
    };
  }

  // Rate limit por usuário (para usuários autenticados)
  userRateLimit(maxAttempts: number = 60, windowMs: number = 15 * 60 * 1000) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const ip = request.ip;
      
      // Se não estiver autenticado, usar IP
      const key = userId ? `user:${userId}` : `ip:${ip}`;
      
      return this.checkRateLimit(key, maxAttempts, windowMs, request, reply);
    };
  }

  private async checkRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number,
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      console.log(`=== RATE LIMIT: Verificando ${key} ===`);
      
      const now = Date.now();
      const data = this.attempts.get(key);

      if (!data) {
        // Primeira tentativa
        this.attempts.set(key, {
          count: 1,
          resetTime: now + windowMs,
          blocked: false
        });
        console.log(`Primeira tentativa para ${key}`);
        return;
      }

      // Verificar se a janela de tempo expirou
      if (now > data.resetTime) {
        console.log(`Janela expirada para ${key}, resetando contador`);
        this.attempts.set(key, {
          count: 1,
          resetTime: now + windowMs,
          blocked: false
        });
        return;
      }

      // Incrementar contador
      data.count++;

      // Verificar se excedeu o limite
      if (data.count > maxAttempts) {
        data.blocked = true;
        console.log(`Rate limit excedido para ${key}: ${data.count}/${maxAttempts}`);
        
        const timeLeft = Math.ceil((data.resetTime - now) / 1000);
        
        return reply.status(429).send({
          error: 'Muitas tentativas. Tente novamente em alguns minutos.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: timeLeft,
          details: {
            maxAttempts,
            currentAttempts: data.count,
            resetIn: `${Math.ceil(timeLeft / 60)} minutos`
          }
        });
      }

      console.log(`Tentativa ${data.count}/${maxAttempts} para ${key}`);
      this.attempts.set(key, data);

      // Adicionar headers informativos
      reply.header('X-RateLimit-Limit', maxAttempts.toString());
      reply.header('X-RateLimit-Remaining', (maxAttempts - data.count).toString());
      reply.header('X-RateLimit-Reset', data.resetTime.toString());

      return;

    } catch (error: unknown) {
      console.error('Erro no rate limiting:', error);
      // Em caso de erro, permitir a requisição
      return;
    }
  }

  // Rate limit específico para recuperação de senha
  forgotPasswordRateLimit(maxAttempts: number = 3, windowMs: number = 60 * 60 * 1000) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const email = body?.email;
      
      if (!email) {
        return; 
      }
      
      const key = `forgot:${email}`;
      return this.checkRateLimit(key, maxAttempts, windowMs, request, reply);
    };
  }

  // Limpar dados antigos da memória
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of this.attempts.entries()) {
      if (now > data.resetTime) {
        this.attempts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Rate limit cleanup: ${cleaned} entradas removidas`);
    }
  }

  // Método para resetar tentativas de um IP/usuário específico (útil para admin)
  resetAttempts(identifier: string) {
    const keys = Array.from(this.attempts.keys()).filter(key => key.includes(identifier));
    keys.forEach(key => this.attempts.delete(key));
    console.log(`Rate limit resetado para: ${identifier}`);
  }

  // Obter estatísticas de rate limiting
  getStats() {
    const stats = {
      totalKeys: this.attempts.size,
      blockedKeys: 0,
      activeAttempts: 0
    };

    for (const [_key, data] of this.attempts.entries()) {
      if (data.blocked) {
        stats.blockedKeys++;
      }
      stats.activeAttempts += data.count;
    }

    return stats;
  }

  // Destruir o middleware (limpar interval)
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export default RateLimitMiddleware;