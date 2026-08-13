import { Module } from '@nestjs/common';
import { EventSeatsController } from './event-seats.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [EventSeatsController, ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
