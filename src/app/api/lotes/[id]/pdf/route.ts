import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { verificarToken } from "@/lib/auth";
import { gerarPdfEtiquetas } from "@/lib/pdf-etiquetas";

const bodySchema = z.object({
  // código de barras gerado no client via JsBarcode (canvas.toDataURL), um PNG base64 por VIN
  imagensBarcode: z.array(z.object({ vin: z.string(), pngBase64: z.string() })),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: loteId } = await params;

  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;
  if (!payload) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const lote = await prisma.lote.findUnique({ where: { id: loteId }, include: { veiculos: true } });
  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });
  if (lote.veiculos.length === 0) {
    return NextResponse.json({ erro: "Lote não possui veículos lidos" }, { status: 422 });
  }

  const config = await prisma.configuracaoEmpresa.findFirst();

  const barcodeImagens = new Map<string, Uint8Array>();
  for (const img of parsed.data.imagensBarcode) {
    const base64Limpo = img.pngBase64.replace(/^data:image\/png;base64,/, "");
    barcodeImagens.set(img.vin, Buffer.from(base64Limpo, "base64"));
  }

  const pdfBytes = await gerarPdfEtiquetas(
    lote.veiculos.map((v: (typeof lote.veiculos)[number]) => ({
      vin: v.vin,
      codigoBarras: v.codigoBarras,
      modelo: v.modelo,
      cor: v.cor,
    })),
    {
      margemTopoMm: config?.margemTopoMm ?? 5,
      margemBaixoMm: config?.margemBaixoMm ?? 5,
      margemEsquerdaMm: config?.margemEsquerdaMm ?? 5,
      margemDireitaMm: config?.margemDireitaMm ?? 5,
      larguraEtiquetaMm: config?.larguraEtiquetaMm ?? 60,
      alturaEtiquetaMm: config?.alturaEtiquetaMm ?? 30,
      colunasPorPagina: config?.colunasPorPagina ?? 3,
      nomeEmpresa: config?.nomeEmpresa,
    },
    barcodeImagens
  );

  const dirDestino = path.join(process.cwd(), "public", "pdfs");
  await mkdir(dirDestino, { recursive: true });
  const nomeArquivo = `${lote.codigo}-${Date.now()}.pdf`;
  await writeFile(path.join(dirDestino, nomeArquivo), pdfBytes);

  const registro = await prisma.pdfGerado.create({
    data: {
      loteId: lote.id,
      operadorId: payload.operadorId,
      caminhoArquivo: `/pdfs/${nomeArquivo}`,
      totalEtiquetas: lote.veiculos.length,
    },
  });

  return NextResponse.json({ pdf: registro, url: registro.caminhoArquivo });
}
