import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarSenha, gerarToken } from "@/lib/auth";

const loginSchema = z.object({
  matricula: z.string().min(1),
  senha: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const { matricula, senha } = parsed.data;

  const operador = await prisma.operador.findUnique({ where: { matricula } });
  if (!operador || !operador.ativo) {
    return NextResponse.json({ erro: "Operador não encontrado ou inativo" }, { status: 401 });
  }

  const senhaValida = await verificarSenha(senha, operador.senhaHash);
  if (!senhaValida) {
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  }

  const token = gerarToken({
    operadorId: operador.id,
    nome: operador.nome,
    matricula: operador.matricula,
    role: operador.role,
  });

  const resposta = NextResponse.json({
    operador: { id: operador.id, nome: operador.nome, matricula: operador.matricula, role: operador.role },
  });
  resposta.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return resposta;
}
