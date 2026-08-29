import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  await prisma.operador.upsert({
    where: { matricula: "admin" },
    update: {},
    create: {
      nome: "Administrador",
      matricula: "admin",
      email: "admin@vpc.local",
      senhaHash,
      role: "ADMIN",
    },
  });

  const senhaHashUser = await bcrypt.hash("11-62-21", 10);
  await prisma.operador.upsert({
    where: { matricula: "11-62-21" },
    update: { senhaHash: senhaHashUser },
    create: {
      nome: "Operador 116221",
      matricula: "11-62-21",
      email: "116221@vpc.local",
      senhaHash: senhaHashUser,
      role: "OPERADOR",
    },
  });

  await prisma.configuracaoEmpresa.upsert({
    where: { id: "config-padrao" },
    update: {},
    create: {
      id: "config-padrao",
      nomeEmpresa: "VPC — Vehicle Processing Center",
      margemTopoMm: 5,
      margemBaixoMm: 5,
      margemEsquerdaMm: 5,
      margemDireitaMm: 5,
      larguraEtiquetaMm: 60,
      alturaEtiquetaMm: 30,
      colunasPorPagina: 3,
    },
  });

  console.log("Seed concluído: operador 'admin' / senha '123456' (troque em produção).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
