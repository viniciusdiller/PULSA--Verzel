import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaMock = { user: { findUnique: jest.Mock } };
type ConfigServiceMock = { getOrThrow: jest.Mock };
type StrategyInternals = { _verifOpts: { algorithms?: string[] } };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaMock: PrismaMock;
  let configServiceMock: ConfigServiceMock;

  const dbUser = {
    id: 'user-1',
    email: 'organizador@elitedev.dev',
    name: 'Organizador Padrão',
    role: Role.ORGANIZER,
  };

  beforeEach(() => {
    prismaMock = { user: { findUnique: jest.fn() } };
    configServiceMock = {
      getOrThrow: jest.fn().mockReturnValue('a-strong-enough-test-secret'),
    };
    strategy = new JwtStrategy(
      configServiceMock as unknown as ConfigService,
      prismaMock as unknown as PrismaService,
    );
  });

  it('fixa o algoritmo aceito em HS256 (evita alg confusion attack)', () => {
    const internals = strategy as unknown as StrategyInternals;
    expect(internals._verifOpts.algorithms).toEqual(['HS256']);
  });

  it('retorna o usuário autenticado quando o payload é válido e o usuário existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);

    const result = await strategy.validate({
      sub: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });

    expect(result).toEqual({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: dbUser.id },
    });
  });

  it('usa o papel atual do banco, não o papel gravado no token (token antigo não deve sobreviver a uma mudança de papel)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...dbUser,
      role: Role.GATE_STAFF,
    });

    const result = await strategy.validate({
      sub: dbUser.id,
      email: dbUser.email,
      role: Role.ORGANIZER,
    });

    expect(result.role).toBe(Role.GATE_STAFF);
  });

  it('rejeita quando o usuário do token não existe mais no banco', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'id-deletado',
        email: 'x@x.com',
        role: Role.CUSTOMER,
      }),
    ).rejects.toThrow(new UnauthorizedException('Usuário não encontrado.'));
  });

  it.each([
    ['sub ausente', { email: 'x@x.com', role: Role.CUSTOMER } as JwtPayload],
    ['email ausente', { sub: 'user-1', role: Role.CUSTOMER } as JwtPayload],
    ['role ausente', { sub: 'user-1', email: 'x@x.com' } as JwtPayload],
  ])('rejeita payload malformado: %s', async (_case, payload) => {
    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('Token inválido.'),
    );
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
