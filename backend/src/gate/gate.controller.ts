import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { GateService } from './gate.service';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { GateHistoryTicketsQueryDto } from './dto/gate-history-tickets-query.dto';
import { GateHistoryEventsQueryDto } from './dto/gate-history-events-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('gate')
@ApiBearerAuth()
@Roles(Role.GATE_STAFF)
@Controller('gate')
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Post('events/:eventId/validate')
  // Código curto (6 dígitos) tem um espaço de busca pequeno (10^6); um
  // limite mais apertado que o default global (60/min) reduz a viabilidade
  // de uma tentativa de força-bruta por uma conta de portaria comprometida.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Valida um ingresso na entrada do evento (QR ou código digitado manualmente)',
  })
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: ValidateTicketDto,
  ) {
    return this.gateService.validate(eventId, dto.code, user.id);
  }

  @Get('history/events')
  @ApiOperation({
    summary:
      'Lista paginada dos eventos em que este atendente já validou algum ingresso, com a contagem por evento',
  })
  listValidatedEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GateHistoryEventsQueryDto,
  ) {
    return this.gateService.listValidatedEvents(user.id, query);
  }

  @Get('history/events/:eventId/tickets')
  @ApiOperation({
    summary:
      'Lista paginada dos ingressos que este atendente validou num evento específico',
  })
  listValidatedTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: GateHistoryTicketsQueryDto,
  ) {
    return this.gateService.listValidatedTickets(user.id, eventId, query);
  }
}
