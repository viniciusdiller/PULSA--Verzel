import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Senha padrão de todos os usuários semeados (documentada no README): "senha123"
const SEED_PASSWORD = 'senha123';

const BCRYPT_ROUNDS = 12;

async function upsertUser(email: string, name: string, role: Role) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  const organizer = await upsertUser('organizador@elitedev.dev', 'Organizador Padrão', Role.ORGANIZER);
  const customer1 = await upsertUser('cliente1@elitedev.dev', 'Cliente Um', Role.CUSTOMER);
  const customer2 = await upsertUser('cliente2@elitedev.dev', 'Cliente Dois', Role.CUSTOMER);
  const gateStaff = await upsertUser('portaria@elitedev.dev', 'Atendente de Portaria', Role.GATE_STAFF);

  // eslint-disable-next-line no-console
  console.log('Seed concluído:', {
    organizer: organizer.email,
    customer1: customer1.email,
    customer2: customer2.email,
    gateStaff: gateStaff.email,
    senha: SEED_PASSWORD,
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
