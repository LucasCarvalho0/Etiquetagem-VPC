import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";
import { validarVin, extrairVinDoQr, normalizarCodigoBarras } from "@/lib/vin";

const leituraSchema = z.object({
  qrCodeBruto: z.string().min(1),
  modelo: z.string().optional(),
  cor: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: loteId } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = leituraSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });
  if (lote.status !== "ABERTO") {
    return NextResponse.json({ erro: "Lote não está aberto para leituras" }, { status: 409 });
  }

  const vin = extrairVinDoQr(parsed.data.qrCodeBruto);
  const validacao = validarVin(vin);
  if (!validacao.valido) {
    return NextResponse.json({ erro: `VIN inválido: ${validacao.motivo}` }, { status: 422 });
  }

  // Regra de negócio: não permitir VIN duplicado no mesmo lote
  const existente = await prisma.veiculo.findUnique({
    where: { loteId_vin: { loteId, vin } },
  });
  if (existente) {
    return NextResponse.json({ erro: "VIN já lido neste lote (duplicado)" }, { status: 409 });
  }

  const veiculo = await prisma.veiculo.create({
    data: {
      vin,
      qrCodeBruto: parsed.data.qrCodeBruto,
      codigoBarras: normalizarCodigoBarras(vin),
      loteId,
      modelo: parsed.data.modelo,
      cor: parsed.data.cor,
    },
  });

  return NextResponse.json({ veiculo }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: loteId } = await params;
  const veiculos = await prisma.veiculo.findMany({
    where: { loteId },
    orderBy: { lidoEm: "asc" },
  });
  return NextResponse.json({ veiculos });
}
