import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { AcknowledgeNoticesDto } from './dto/acknowledge-notices.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('notices')
@ApiBearerAuth()
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get('pending')
  @ApiOperation({
    summary:
      'Avisos de cancelamento de evento ainda não vistos pelo usuário autenticado',
  })
  findPending(@CurrentUser() user: AuthenticatedUser) {
    return this.noticesService.findPending(user.id);
  }

  @Post('acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca avisos como vistos' })
  acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcknowledgeNoticesDto,
  ) {
    return this.noticesService.acknowledge(user.id, dto.ids);
  }
}
