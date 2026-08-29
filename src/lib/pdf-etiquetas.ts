import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface DadosEtiqueta {
  vin: string;
  codigoBarras: string;
  modelo?: string | null;
  cor?: string | null;
}

export interface ConfigLayoutEtiqueta {
  margemTopoMm: number;
  margemBaixoMm: number;
  margemEsquerdaMm: number;
  margemDireitaMm: number;
  larguraEtiquetaMm: number;
  alturaEtiquetaMm: number;
  colunasPorPagina: number;
  nomeEmpresa?: string;
}

const MM_TO_PT = 72 / 25.4;
const A4_LARGURA_MM = 210;
const A4_ALTURA_MM = 297;

/**
 * Gera um PDF A4 com etiquetas em grid, cada uma contendo VIN + código de barras
 * renderizado como um "barcode" visual simplificado (barras verticais) — para produção
 * real, o barcodeDataUrl deve vir do JsBarcode (canvas) no client e ser passado como PNG.
 */
export async function gerarPdfEtiquetas(
  etiquetas: DadosEtiqueta[],
  config: ConfigLayoutEtiqueta,
  barcodeImagens: Map<string, Uint8Array> // vin -> PNG bytes gerados via JsBarcode no client
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const larguraPt = A4_LARGURA_MM * MM_TO_PT;
  const alturaPt = A4_ALTURA_MM * MM_TO_PT;
  const margemEsqPt = config.margemEsquerdaMm * MM_TO_PT;
  const margemTopoPt = config.margemTopoMm * MM_TO_PT;
  const margemBaixoPt = config.margemBaixoMm * MM_TO_PT;
  const margemDirPt = config.margemDireitaMm * MM_TO_PT;
  const etiquetaLarguraPt = config.larguraEtiquetaMm * MM_TO_PT;
  const etiquetaAlturaPt = config.alturaEtiquetaMm * MM_TO_PT;
  const colunas = config.colunasPorPagina;

  const areaUtilAlturaPt = alturaPt - margemTopoPt - margemBaixoPt;
  const linhasPorPagina = Math.max(1, Math.floor(areaUtilAlturaPt / etiquetaAlturaPt));
  const etiquetasPorPagina = colunas * linhasPorPagina;

  let pagina = pdfDoc.addPage([larguraPt, alturaPt]);
  let indexNaPagina = 0;

  for (let i = 0; i < etiquetas.length; i++) {
    if (indexNaPagina === etiquetasPorPagina) {
      pagina = pdfDoc.addPage([larguraPt, alturaPt]);
      indexNaPagina = 0;
    }

    const col = indexNaPagina % colunas;
    const linha = Math.floor(indexNaPagina / colunas);

    const x = margemEsqPt + col * etiquetaLarguraPt;
    const yTopo = alturaPt - margemTopoPt - linha * etiquetaAlturaPt;
    const yBase = yTopo - etiquetaAlturaPt;

    const etiqueta = etiquetas[i];

    // Removemos as bordas (drawRectangle) e textos acessórios para ficar IDÊNTICO à foto exigida.

    const imagemBarcode = barcodeImagens.get(etiqueta.vin);
    if (imagemBarcode) {
      const png = await pdfDoc.embedPng(imagemBarcode);
      
      // O código de barras é a estrela: bem alto e largo, mantendo a proporção
      const targetHeight = etiquetaAlturaPt * 0.55; 
      const scaleFactor = targetHeight / png.height;
      const targetWidth = png.width * scaleFactor;
      
      const imgX = x + (etiquetaLarguraPt - targetWidth) / 2;
      const imgY = yBase + (etiquetaAlturaPt * 0.35); // Barcode na parte superior do slot

      pagina.drawImage(png, {
        x: imgX,
        y: imgY,
        width: targetWidth,
        height: targetHeight,
      });

      // O VIN (Chassi) vai colado exatamente abaixo do barcode, leitura limpa e gigante
      const vinSize = 24; 
      const vinWidth = fonteBold.widthOfTextAtSize(etiqueta.vin, vinSize);
      pagina.drawText(etiqueta.vin, {
        x: x + (etiquetaLarguraPt - vinWidth) / 2,
        y: imgY - 22, // 22 pontos abaixo do limite inferior do barcode
        size: vinSize,
        font: fonteBold,
        color: rgb(0, 0, 0),
      });
    }

    indexNaPagina++;
  }

  return pdfDoc.save();
}
