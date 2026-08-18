process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/elite_dev_tickets?schema=public';
process.env.JWT_SECRET ??= 'e2e-only-jwt-secret-0123456789';
process.env.QR_SIGNING_SECRET ??= 'e2e-only-qr-secret-9876543210';
process.env.HOLD_TTL_MINUTES ??= '7';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.PORT ??= '3333';

// E2E tests override Prisma with an in-memory mock. The database URL above is
// still required because AppModule validates the complete environment at boot.
