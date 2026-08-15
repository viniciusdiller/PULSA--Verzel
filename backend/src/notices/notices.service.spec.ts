import { NoticesService } from './notices.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NoticesService', () => {
  let service: NoticesService;
  let prisma: {
    eventCancellationNotice: { findMany: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      eventCancellationNotice: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new NoticesService(prisma as unknown as PrismaService);
  });

  describe('findPending', () => {
    it('busca só os avisos não reconhecidos do usuário, mais recente primeiro', async () => {
      prisma.eventCancellationNotice.findMany.mockResolvedValue([
        { id: 'notice-1', eventTitle: 'Show X', refundedCents: 15000 },
      ]);

      const result = await service.findPending('user-1');

      expect(prisma.eventCancellationNotice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', acknowledgedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('acknowledge', () => {
    it('marca acknowledgedAt só nos avisos pertencentes ao usuário que está pedindo', async () => {
      await service.acknowledge('user-1', ['notice-1', 'notice-2']);

      expect(prisma.eventCancellationNotice.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['notice-1', 'notice-2'] },
          userId: 'user-1',
          acknowledgedAt: null,
        },
        data: { acknowledgedAt: expect.any(Date) as Date },
      });
    });
  });
});
