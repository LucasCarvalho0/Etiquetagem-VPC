import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";

const configSchema = z.object({
  nomeEmpresa: z.string().min(1),
  logoUrl: z.string().optional(),
  margemTopoMm: z.number().positive(),
  margemBaixoMm: z.number().positive(),
  margemEsquerdaMm: z.number().positive(),
  margemDireitaMm: z.number().positive(),
  larguraEtiquetaMm: z.number().positive(),
  alturaEtiquetaMm: z.number().positive(),
  colunasPorPagina: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  let config = await prisma.configuracaoEmpresa.findFirst();
  if (!config) {
    config = await prisma.configuracaoEmpresa.create({
      data: { nomeEmpresa: "Minha Empresa" },
    });
  }
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  // Apenas SUPERVISOR ou ADMIN podem alterar configurações
  if (payload.role === "OPERADOR") {
    return NextResponse.json({ erro: "Sem permissão para alterar configurações" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const existente = await prisma.configuracaoEmpresa.findFirst();
  const config = existente
    ? await prisma.configuracaoEmpresa.update({ where: { id: existente.id }, data: parsed.data })
    : await prisma.configuracaoEmpresa.create({ data: parsed.data });

  return NextResponse.json({ config });
}
