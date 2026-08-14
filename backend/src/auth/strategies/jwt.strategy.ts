import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      // Fixa o algoritmo esperado para impedir "alg confusion attack" (ex.
      // um token forjado com alg=none ou trocando para um algoritmo
      // assimétrico onde a "chave pública" seria o próprio secret).
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    // O papel usado nas decisões de autorização vem sempre do banco
    // (fonte de verdade atual), nunca do payload do token — evita que um
    // token antigo continue com um papel que já foi alterado no banco.
    return { id: user.id, email: user.email, role: user.role };
  }
}
