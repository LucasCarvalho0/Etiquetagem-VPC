import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";

const criarLoteSchema = z.object({
  clienteFrota: z.string().optional(),
  observacoes: z.string().optional(),
});

function gerarCodigoLote(): string {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10).replace(/-/g, "");
  const sufixo = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOTE-${data}-${sufixo}`;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = criarLoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const lote = await prisma.lote.create({
    data: {
      codigo: gerarCodigoLote(),
      operadorId: payload.operadorId,
      clienteFrota: parsed.data.clienteFrota,
      observacoes: parsed.data.observacoes,
    },
  });

  return NextResponse.json({ lote }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const dataInicio = searchParams.get("dataInicio") || undefined;
  const dataFim = searchParams.get("dataFim") || undefined;

  const lotes = await prisma.lote.findMany({
    where: {
      status: status as never,
      iniciadoEm: {
        gte: dataInicio ? new Date(dataInicio) : undefined,
        lte: dataFim ? new Date(dataFim) : undefined,
      },
    },
    include: { operador: { select: { nome: true, matricula: true } }, _count: { select: { veiculos: true } } },
    orderBy: { iniciadoEm: "desc" },
  });

  return NextResponse.json({ lotes });
}
