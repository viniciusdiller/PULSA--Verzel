import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    event: { count: jest.Mock };
    ticket: { count: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const dbUser = {
    id: 'user-1',
    email: 'organizador@elitedev.dev',
    name: 'Organizador Padrão',
    role: Role.ORGANIZER,
    passwordHash: 'hashed-password',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    balanceCents: 0,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      event: { count: jest.fn().mockResolvedValue(3) },
      ticket: { count: jest.fn().mockResolvedValue(0) },
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
    prisma.event.count.mockResolvedValue(3);
    prisma.ticket.count.mockResolvedValue(0);
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
    it('retorna os dados públicos do usuário autenticado, com a métrica do papel', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(dbUser);
      prisma.event.count.mockResolvedValue(3);

      const result = await service.me(dbUser.id);

      expect(result).toEqual({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        balanceCents: dbUser.balanceCents,
        statsCount: 3,
        statsLabel: 'Eventos publicados',
      });
      expect(prisma.event.count).toHaveBeenCalledWith({
        where: { organizerId: dbUser.id, status: 'PUBLISHED' },
      });
    });

    it('conta ingressos pra CUSTOMER e validações pra GATE_STAFF', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...dbUser,
        role: Role.CUSTOMER,
      });
      prisma.ticket.count.mockResolvedValue(2);

      const result = await service.me(dbUser.id);

      expect(result.statsCount).toBe(2);
      expect(result.statsLabel).toBe('Ingressos');
      expect(prisma.ticket.count).toHaveBeenCalledWith({
        where: { ownerId: dbUser.id },
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

  describe('updateProfile', () => {
    it('atualiza só o nome quando nenhuma senha é enviada', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(dbUser);
      prisma.user.update.mockResolvedValue({ ...dbUser, name: 'Novo Nome' });

      const result = await service.updateProfile(dbUser.id, {
        name: 'Novo Nome',
      });

      expect(result.name).toBe('Novo Nome');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: dbUser.id },
        data: { name: 'Novo Nome' },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('troca a senha quando a senha atual confere', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('novo-hash');
      prisma.user.update.mockResolvedValue(dbUser);

      await service.updateProfile(dbUser.id, {
        currentPassword: 'senha123',
        newPassword: 'senha-nova-456',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'senha123',
        dbUser.passwordHash,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: dbUser.id },
        data: { passwordHash: 'novo-hash' },
      });
    });

    it('rejeita com BadRequest quando a senha atual está errada', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updateProfile(dbUser.id, {
          currentPassword: 'senha-errada',
          newPassword: 'senha-nova-456',
        }),
      ).rejects.toThrow(new BadRequestException('Senha atual incorreta.'));
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
