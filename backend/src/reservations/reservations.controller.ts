import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { PayReservationDto } from './dto/pay-reservation.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('reservations')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Detalhe de uma reserva do cliente autenticado (status, contador do hold etc.)',
  })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reservationsService.getMine(user.id, id);
  }

  @Post(':id/pay')
  @ApiOperation({
    summary:
      'Paga (simulado) uma reserva em hold — aprova ou recusa deterministicamente',
  })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayReservationDto,
  ) {
    return this.reservationsService.pay(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Cancela uma reserva em hold antes do pagamento, liberando o assento na hora',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reservationsService.cancel(user.id, id);
  }

  @Post(':id/cancel-paid')
  @ApiOperation({
    summary:
      'Cancela um ingresso já pago (antes do evento acontecer, sem ter sido usado na portaria), reembolsando o valor em saldo',
  })
  cancelPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reservationsService.cancelPaid(user.id, id);
  }
}
