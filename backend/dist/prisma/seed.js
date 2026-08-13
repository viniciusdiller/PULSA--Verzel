"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
const SEED_PASSWORD = 'senha123';
async function upsertUser(email, name, role) {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    return prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name, role, passwordHash },
    });
}
async function main() {
    const organizer = await upsertUser('organizador@elitedev.dev', 'Organizador Padrão', client_1.Role.ORGANIZER);
    const customer1 = await upsertUser('cliente1@elitedev.dev', 'Cliente Um', client_1.Role.CUSTOMER);
    const customer2 = await upsertUser('cliente2@elitedev.dev', 'Cliente Dois', client_1.Role.CUSTOMER);
    const gateStaff = await upsertUser('portaria@elitedev.dev', 'Atendente de Portaria', client_1.Role.GATE_STAFF);
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
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map