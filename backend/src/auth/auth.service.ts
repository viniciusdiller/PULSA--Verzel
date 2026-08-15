import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileDto } from './dto/profile.dto';

const STATS_LABEL: Record<Role, string> = {
  CUSTOMER: 'Ingressos',
  ORGANIZER: 'Eventos publicados',
  GATE_STAFF: 'Validações feitas',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ??
          '24h') as unknown as number,
      },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async me(userId: string): Promise<ProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const statsCount = await this.countStatsForRole(userId, user.role);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      balanceCents: user.balanceCents,
      statsCount,
      statsLabel: STATS_LABEL[user.role],
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    let passwordHash: string | undefined;
    if (dto.newPassword) {
      const currentMatches = await bcrypt.compare(
        dto.currentPassword ?? '',
        user.passwordHash,
      );
      if (!currentMatches) {
        throw new BadRequestException('Senha atual incorreta.');
      }
      passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    const statsCount = await this.countStatsForRole(userId, updated.role);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      createdAt: updated.createdAt,
      balanceCents: updated.balanceCents,
      statsCount,
      statsLabel: STATS_LABEL[updated.role],
    };
  }

  private countStatsForRole(userId: string, role: Role): Promise<number> {
    switch (role) {
      case Role.ORGANIZER:
        return this.prisma.event.count({
          where: { organizerId: userId, status: 'PUBLISHED' },
        });
      case Role.GATE_STAFF:
        return this.prisma.ticket.count({
          where: { usedByGateUserId: userId },
        });
      case Role.CUSTOMER:
      default:
        return this.prisma.ticket.count({ where: { ownerId: userId } });
    }
  }
}
