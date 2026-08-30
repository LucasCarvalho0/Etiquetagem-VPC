/**
 * Gera um código de barras Code128 como Uint8Array de PNG usando bwip-js.
 * Compatível com Node.js e Vercel (server-side). 
 * 
 * bwip-js é a implementação mais robusta e certificada de geração de barcodes,
 * usada em ambientes industriais. Garante leitura por coletores industriais.
 */
import bwipjs from "bwip-js";

/**
 * Gera um PNG de código de barras Code128 usando bwip-js.
 * Retorna Uint8Array do PNG pronto para embeddar no PDF.
 */
export async function gerarBarcodePngNode(valor: string): Promise<Uint8Array> {
  const pngBuffer = await bwipjs.toBuffer({
    bcid: "code128",       // Tipo: Code128 (padrão industrial)
    text: valor,           // Dado a codificar (VIN)
    scale: 3,              // Escala (3x para alta resolução)
    height: 15,            // Altura das barras em mm
    includetext: true,     // Exibe o texto abaixo das barras
    textxalign: "center",  // Centraliza o texto
    textsize: 10,          // Tamanho da fonte do texto
    paddingwidth: 10,      // Quiet zone horizontal (obrigatório para leitura)
    paddingheight: 3,      // Quiet zone vertical
    backgroundcolor: "ffffff", // Fundo branco
    barcolor: "000000",    // Barras pretas
  });

  return new Uint8Array(pngBuffer);
}
