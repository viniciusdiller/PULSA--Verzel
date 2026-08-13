import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: Prisma.PrismaClientKnownRequestError): HttpException {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException('Já existe um registro com esses dados (violação de unicidade).');
      case 'P2025':
        return new NotFoundException('Registro não encontrado.');
      default:
        return new HttpException('Erro inesperado ao acessar o banco de dados.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
