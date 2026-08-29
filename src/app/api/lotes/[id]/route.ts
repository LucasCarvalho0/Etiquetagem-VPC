import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id: loteId } = await params;

  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });

  // Apenas ADMIN pode excluir qualquer lote; operador só exclui o próprio
  const ehDono = lote.operadorId === payload.operadorId;
  const ehAdmin = payload.role === "ADMIN" || payload.role === "SUPERVISOR";
  if (!ehDono && !ehAdmin) {
    return NextResponse.json({ erro: "Sem permissão para excluir este lote" }, { status: 403 });
  }

  // Exclui em cascata: veículos → pdfs → lote
  await prisma.veiculo.deleteMany({ where: { loteId } });
  await prisma.pdfGerado.deleteMany({ where: { loteId } });
  await prisma.lote.delete({ where: { id: loteId } });

  return NextResponse.json({ ok: true });
}
