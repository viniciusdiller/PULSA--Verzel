import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GateService } from './gate.service';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
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
}
