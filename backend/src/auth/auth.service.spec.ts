import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const dbUser = {
    id: 'user-1',
    email: 'organizador@elitedev.dev',
    name: 'Organizador Padrão',
    role: Role.ORGANIZER,
    passwordHash: 'hashed-password',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    configService = { get: jest.fn().mockReturnValue('24h') };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );

    jest.clearAllMocks();
    prisma.user.findUnique.mockReset();
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
    configService.get.mockReturnValue('24h');
  });

  describe('login', () => {
    it('retorna accessToken e dados do usuário quando as credenciais estão corretas', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: dbUser.email,
        password: 'senha123',
      });

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'senha123',
        dbUser.passwordHash,
      );
    });

    it('assina o JWT com sub/email/role e o expiresIn configurado', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      configService.get.mockReturnValue('2h');

      await service.login({ email: dbUser.email, password: 'senha123' });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: dbUser.id, email: dbUser.email, role: dbUser.role },
        { expiresIn: '2h' },
      );
    });

    it('usa 24h como padrão de expiração quando JWT_EXPIRES_IN não está definido', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      configService.get.mockReturnValue(undefined);

      await service.login({ email: dbUser.email, password: 'senha123' });

      expect(jwtService.signAsync).toHaveBeenCalledWith(expect.anything(), {
        expiresIn: '24h',
      });
    });

    it('rejeita com "Credenciais inválidas." quando o email não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nao-existe@elitedev.dev',
          password: 'qualquer123',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas.'));
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejeita com "Credenciais inválidas." quando a senha está errada', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: dbUser.email, password: 'senha-errada' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas.'));
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('retorna exatamente a mesma mensagem de erro para email inexistente e senha errada (evita enumeração de usuários)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      let messageForMissingUser = '';
      try {
        await service.login({
          email: 'ghost@elitedev.dev',
          password: 'x'.repeat(8),
        });
      } catch (error) {
        messageForMissingUser = (error as UnauthorizedException).message;
      }

      prisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let messageForWrongPassword = '';
      try {
        await service.login({ email: dbUser.email, password: 'x'.repeat(8) });
      } catch (error) {
        messageForWrongPassword = (error as UnauthorizedException).message;
      }

      expect(messageForMissingUser).toBe(messageForWrongPassword);
    });
  });

  describe('me', () => {
    it('retorna os dados públicos do usuário autenticado', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(dbUser);

      const result = await service.me(dbUser.id);

      expect(result).toEqual({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      });
      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: dbUser.id },
      });
    });

    it('propaga o erro quando o usuário não existe mais no banco', async () => {
      prisma.user.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found'),
      );

      await expect(service.me('id-inexistente')).rejects.toThrow(
        'Record not found',
      );
    });
  });
});
