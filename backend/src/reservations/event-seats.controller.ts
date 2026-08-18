import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RATE_LIMITS } from '../common/throttling/rate-limit.constants';

@ApiTags('reservations')
@Controller('events/:eventId')
export class EventSeatsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Get('seatmap')
  @Throttle({ default: RATE_LIMITS.publicSeatMap })
  @ApiOperation({
    summary:
      'Mapa de assentos do evento com status atual (disponível/reservado/vendido)',
  })
  getSeatMap(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.reservationsService.getSeatMap(eventId);
  }

  @Post('seats/:seatId/hold')
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Reserva temporariamente um assento (hold) para o cliente autenticado',
  })
  hold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('seatId', ParseUUIDPipe) seatId: string,
  ) {
    return this.reservationsService.holdSeat(user.id, eventId, seatId);
  }
}
