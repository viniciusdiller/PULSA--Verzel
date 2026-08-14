import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  function createContext(user: unknown): ExecutionContext {
    const handler = jest.fn();
    const clazz = jest.fn();
    return {
      getHandler: () => handler,
      getClass: () => clazz,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function makeGuard(requiredRoles: Role[] | undefined) {
    const reflectorMock = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    };
    return {
      guard: new RolesGuard(reflectorMock as unknown as Reflector),
      reflectorMock,
    };
  }

  it('libera acesso quando a rota não declara @Roles() (metadata undefined)', () => {
    const { guard } = makeGuard(undefined);

    expect(guard.canActivate(createContext({ role: Role.CUSTOMER }))).toBe(
      true,
    );
  });

  it('libera acesso quando @Roles() está presente mas vazio', () => {
    const { guard } = makeGuard([]);

    expect(guard.canActivate(createContext({ role: Role.CUSTOMER }))).toBe(
      true,
    );
  });

  it('libera acesso quando o papel do usuário está entre os papéis exigidos', () => {
    const { guard } = makeGuard([Role.ORGANIZER, Role.GATE_STAFF]);

    expect(guard.canActivate(createContext({ role: Role.ORGANIZER }))).toBe(
      true,
    );
  });

  it('nega acesso quando o papel do usuário não está entre os papéis exigidos', () => {
    const { guard } = makeGuard([Role.ORGANIZER]);

    expect(guard.canActivate(createContext({ role: Role.CUSTOMER }))).toBe(
      false,
    );
  });

  it('nega acesso quando não há papéis exigidos que batam e o request não tem usuário (guard mal ordenado)', () => {
    const { guard } = makeGuard([Role.GATE_STAFF]);

    expect(guard.canActivate(createContext(undefined))).toBe(false);
  });

  it('consulta o metadata tanto do handler quanto da classe', () => {
    const { guard, reflectorMock } = makeGuard([Role.CUSTOMER]);
    const context = createContext({ role: Role.CUSTOMER });

    guard.canActivate(context);

    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
