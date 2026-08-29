import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";
import { gerarPdfEtiquetas } from "@/lib/pdf-etiquetas";
import { gerarBarcodePngNode } from "../../../../../lib/barcode-node";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: loteId } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: { veiculos: { orderBy: { posicaoEtiqueta: "asc" } } },
  });
  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });
  if (lote.veiculos.length === 0) {
    return NextResponse.json({ erro: "Lote não possui veículos lidos" }, { status: 422 });
  }

  const config = await prisma.configuracaoEmpresa.findFirst();

  // Gera barcodes no servidor (sem depender do DOM)
  const barcodeImagens = new Map<string, Uint8Array>();
  for (const v of lote.veiculos) {
    const pngBuffer = await gerarBarcodePngNode(v.vin);
    barcodeImagens.set(v.vin, pngBuffer);
  }

  const pdfBytes = await gerarPdfEtiquetas(
    lote.veiculos.map((v) => ({
      vin: v.vin,
      codigoBarras: v.codigoBarras,
      modelo: v.modelo,
      cor: v.cor,
    })),
    {
      // Força 10 itens por página: 1 coluna centralizada
      margemTopoMm: 10,
      margemBaixoMm: 10,
      margemEsquerdaMm: 10,
      margemDireitaMm: 10,
      larguraEtiquetaMm: 190, // A4 largura (210) - margens
      alturaEtiquetaMm: 27.7, // A4 área útil (277) / 10
      colunasPorPagina: 1,
      nomeEmpresa: config?.nomeEmpresa,
    },
    barcodeImagens
  );

  // Registra no banco (sem salvar em disco)
  await prisma.pdfGerado.create({
    data: {
      loteId: lote.id,
      operadorId: payload.operadorId,
      caminhoArquivo: `gerado-em-memoria`,
      totalEtiquetas: lote.veiculos.length,
    },
  });

  // Retorna o PDF diretamente como stream de bytes
  const nomeArquivo = `${lote.codigo}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Content-Length": pdfBytes.byteLength.toString(),
    },
  });
}
