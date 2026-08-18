import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventListQueryDto } from './dto/event-list-query.dto';
import { OrganizerEventListQueryDto } from './dto/organizer-event-list-query.dto';
import { EventFeaturedQueryDto } from './dto/event-featured-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RATE_LIMITS } from '../common/throttling/rate-limit.constants';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Organizador cria um evento (rascunho) com suas seções/assentos',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  @Patch(':id/publish')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publica um evento em rascunho (só o organizador dono)',
  })
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.publish(user.id, id);
  }

  @Patch(':id/unpublish')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Despublica um evento (volta a rascunho, some da listagem pública)',
  })
  unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.unpublish(user.id, id);
  }

  @Patch(':id')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Edita descrição/endereço/setores de um evento (só o organizador dono)',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(user.id, id, dto);
  }

  @Patch(':id/feature')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Adiciona um evento publicado aos "Em destaque" da home pública (máx. 4 por fonte — Ticketmaster e TMDB têm vitrines independentes)',
  })
  feature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.feature(user.id, id);
  }

  @Patch(':id/unfeature')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove um evento dos "Em destaque" da home pública',
  })
  unfeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.unfeature(user.id, id);
  }

  @Delete(':id')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exclui um evento (sem reserva) ou cancela com estorno em saldo pros clientes (com reserva) — só o organizador dono',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.remove(user.id, id);
  }

  @Delete(':id/purge')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Exclui definitivamente um evento já cancelado (some até do filtro "Cancelado") — só o organizador dono',
  })
  purge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.purge(user.id, id);
  }

  @Public()
  @Get()
  @Throttle({ default: RATE_LIMITS.publicEventList })
  @ApiOperation({
    summary: 'Lista eventos publicados, com busca por título/cidade',
  })
  findPublished(@Query() query: EventListQueryDto) {
    return this.eventsService.findPublished(query);
  }

  @Public()
  @Get('featured')
  @Throttle({ default: RATE_LIMITS.publicFeaturedEvents })
  @ApiOperation({
    summary:
      'Lista os eventos em destaque na home pública (no máx. 4, ou 4 por fonte se `source` for informado)',
  })
  findFeatured(@Query() query: EventFeaturedQueryDto) {
    return this.eventsService.findFeatured(query.source);
  }

  @Get('organizer/stats')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Painel financeiro: receita e ingressos vendidos por evento do organizador autenticado',
  })
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.getOrganizerStats(user.id);
  }

  @Get('organizer/mine')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lista paginada dos eventos do organizador autenticado, com filtro opcional por status',
  })
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizerEventListQueryDto,
  ) {
    return this.eventsService.findMine(user.id, query);
  }

  @Get('organizer/mine/:id')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Detalhe de um evento do organizador autenticado (qualquer status)',
  })
  findMineById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.findMineById(user.id, id);
  }

  @Public()
  @Get(':id')
  @Throttle({ default: RATE_LIMITS.publicEventDetail })
  @ApiOperation({
    summary:
      'Detalhe de um evento publicado (rascunhos não aparecem aqui — o organizador usa /events/organizer/mine)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findPublishedById(id);
  }
}
