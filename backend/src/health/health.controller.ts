import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Health check — usado pelo Render pra saber se o serviço está no ar',
  })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
