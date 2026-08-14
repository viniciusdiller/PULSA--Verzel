import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

interface ErrorBody {
  message: string;
}

function makeError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    'mensagem interna do prisma',
    {
      code,
      clientVersion: '6.19.3',
    },
  );
}

function getJsonBody(jsonMock: jest.Mock<void, [ErrorBody]>): ErrorBody {
  const [body] = jsonMock.mock.calls[0];
  return body;
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock<void, [ErrorBody]>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    jsonMock = jest.fn<void, [ErrorBody]>();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('mapeia P2002 (violação de unicidade) para 409 Conflict sem vazar a mensagem interna do Prisma', () => {
    filter.catch(makeError('P2002'), host);

    expect(statusMock).toHaveBeenCalledWith(409);
    const body = getJsonBody(jsonMock);
    expect(body.message).toBe(
      'Já existe um registro com esses dados (violação de unicidade).',
    );
    expect(JSON.stringify(body)).not.toContain('mensagem interna do prisma');
  });

  it('mapeia P2025 (registro não encontrado) para 404 Not Found', () => {
    filter.catch(makeError('P2025'), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(getJsonBody(jsonMock).message).toBe('Registro não encontrado.');
  });

  it.each(['P2003', 'P1001', 'P9999'])(
    'mapeia qualquer outro código Prisma (%s) para 500 sem vazar detalhes internos',
    (code) => {
      filter.catch(makeError(code), host);

      expect(statusMock).toHaveBeenCalledWith(500);
      const body = getJsonBody(jsonMock);
      expect(body.message).toBe('Erro inesperado ao acessar o banco de dados.');
      expect(JSON.stringify(body)).not.toContain('mensagem interna do prisma');
    },
  );
});
