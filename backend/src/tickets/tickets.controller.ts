import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Precisa vir ANTES de ':shareSlug' — senão "mine" seria interpretado
  // como um shareSlug e nunca cairia aqui.
  @Get('mine')
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista os ingressos do cliente autenticado' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findMine(user.id);
  }

  @Public()
  @Get(':shareSlug')
  @ApiOperation({
    summary: 'Ingresso por link de compartilhamento (sem autenticação)',
  })
  findByShareSlug(@Param('shareSlug') shareSlug: string) {
    return this.ticketsService.findByShareSlug(shareSlug);
  }
}
