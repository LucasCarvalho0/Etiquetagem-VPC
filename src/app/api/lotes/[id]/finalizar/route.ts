import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: loteId } = await params;
  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const lote = await prisma.lote.update({
    where: { id: loteId },
    data: { status: "FINALIZADO", finalizadoEm: new Date() },
  });

  return NextResponse.json({ lote });
}
