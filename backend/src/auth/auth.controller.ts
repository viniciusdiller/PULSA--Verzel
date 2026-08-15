import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileDto } from './dto/profile.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Throttle mais restritivo que o padrão global (60/min) especificamente
  // no login, para dificultar força bruta de senha por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Login com email e senha, retorna JWT + dados do usuário',
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Retorna o perfil do usuário autenticado (dados + métrica do papel)',
  })
  me(@CurrentUser() user: AuthenticatedUser): Promise<ProfileDto> {
    return this.authService.me(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualiza nome e/ou senha do usuário autenticado',
  })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.authService.updateProfile(user.id, dto);
  }
}
