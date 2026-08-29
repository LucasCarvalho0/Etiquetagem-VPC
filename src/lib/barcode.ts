"use client";

import JsBarcode from "jsbarcode";

/**
 * Gera um código de barras (Code128) a partir de um VIN e retorna como PNG base64.
 * Executa no client via <canvas>, pois JsBarcode depende do DOM.
 */
export function gerarBarcodePng(valor: string, largura = 500, altura = 120): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, valor, {
    format: "CODE128",
    width: 2,
    height: altura * 0.7,
    displayValue: true,
    fontSize: 16,
    margin: 8,
  });
  return canvas.toDataURL("image/png");
}
