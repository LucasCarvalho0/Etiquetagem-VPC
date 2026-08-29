import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";
import { validarVin, extrairVinDoQr, normalizarCodigoBarras } from "@/lib/vin";

const edicaoSchema = z.object({
  qrCodeBruto: z.string().optional(),
  vin: z.string().min(17).optional(),
  modelo: z.string().optional(),
  cor: z.string().optional(),
});

type Context = { params: Promise<{ id: string; veiculoId: string }> };

export async function DELETE(req: NextRequest, { params }: Context) {
  const { id: loteId, veiculoId } = await params;
  
  const token = req.cookies.get("token")?.value;
  if (!token || !verificarToken(token)) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote || lote.status !== "ABERTO") {
    return NextResponse.json({ erro: "Lote não aberto ou não encontrado" }, { status: 409 });
  }

  try {
    await prisma.veiculo.delete({ where: { id: veiculoId, loteId } });
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ erro: "Veículo não encontrado" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  const { id: loteId, veiculoId } = await params;
  
  const token = req.cookies.get("token")?.value;
  if (!token || !verificarToken(token)) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = edicaoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote || lote.status !== "ABERTO") {
    return NextResponse.json({ erro: "Lote não aberto ou não encontrado" }, { status: 409 });
  }

  // Se estiver enviando VIN novo para corrigir leitura incorreta:
  let codigoBarras: string | undefined = undefined;
  if (parsed.data.vin) {
    const validacao = validarVin(parsed.data.vin);
    if (!validacao.valido) {
      return NextResponse.json({ erro: `VIN inválido: ${validacao.motivo}` }, { status: 422 });
    }
    codigoBarras = normalizarCodigoBarras(parsed.data.vin);

    // previne duplicatas
    const existente = await prisma.veiculo.findFirst({
      where: { loteId, vin: parsed.data.vin, id: { not: veiculoId } }
    });
    if (existente) {
      return NextResponse.json({ erro: "VIN já existe neste lote (duplicado)" }, { status: 409 });
    }
  }

  try {
    const atualizado = await prisma.veiculo.update({
      where: { id: veiculoId, loteId },
      data: {
        vin: parsed.data.vin,
        codigoBarras: codigoBarras,
        modelo: parsed.data.modelo,
        cor: parsed.data.cor,
        ...(parsed.data.qrCodeBruto && { qrCodeBruto: parsed.data.qrCodeBruto })
      }
    });
    return NextResponse.json({ veiculo: atualizado });
  } catch (error) {
    return NextResponse.json({ erro: "Veículo não encontrado" }, { status: 404 });
  }
}
