import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { CatalogSearchQueryDto } from './dto/catalog-search-query.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('catalog')
@ApiBearerAuth()
@Roles(Role.ORGANIZER)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('events')
  // Protege a API key da Ticketmaster contra buscas em excesso — mais
  // apertado que o throttle global de 60/min, mas com folga suficiente pra
  // uma sessão real de busca (o front já faz debounce de 450ms por tecla,
  // então isso aqui é rede de segurança contra abuso, não o limite normal).
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Busca no catálogo externo — shows (Ticketmaster Discovery) ou filmes (TMDb), conforme `source`',
  })
  search(@Query() query: CatalogSearchQueryDto) {
    return this.catalogService.search(query);
  }

  @Get('events/:externalId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Detalhe de um evento do catálogo externo, para pré-preencher a publicação',
  })
  getById(@Param('externalId') externalId: string) {
    return this.catalogService.getById(externalId);
  }
}
