import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type ReflectorMock = { getAllAndOverride: jest.Mock };

function makeReflectorMock(returnValue: unknown): ReflectorMock {
  return { getAllAndOverride: jest.fn().mockReturnValue(returnValue) };
}

describe('JwtAuthGuard', () => {
  function createContext(): ExecutionContext {
    const handler = jest.fn();
    const clazz = jest.fn();
    return {
      getHandler: () => handler,
      getClass: () => clazz,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('permite acesso sem checar o JWT quando a rota é @Public()', () => {
    const reflectorMock = makeReflectorMock(true);
    const guard = new JwtAuthGuard(reflectorMock as unknown as Reflector);
    const superCanActivateSpy = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    );

    const context = createContext();
    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivateSpy).not.toHaveBeenCalled();
    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
  });

  it('delega para a estratégia JWT (passport) quando a rota não é pública', () => {
    const reflectorMock = makeReflectorMock(false);
    const guard = new JwtAuthGuard(reflectorMock as unknown as Reflector);
    const superCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(createContext());

    expect(superCanActivateSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('também delega quando o metadata de @Public() está ausente (undefined)', () => {
    const reflectorMock = makeReflectorMock(undefined);
    const guard = new JwtAuthGuard(reflectorMock as unknown as Reflector);
    const superCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(false);

    const result = guard.canActivate(createContext());

    expect(superCanActivateSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });
});
