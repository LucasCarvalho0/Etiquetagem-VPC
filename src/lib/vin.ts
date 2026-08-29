/**
 * Validação de VIN (Vehicle Identification Number).
 * Validação simples: VIN com 17 caracteres alfanuméricos.
 * Não fazemos correções automáticas de I, O, Q para evitar adulterações.
 */
export function validarVin(vin: string): { valido: boolean; motivo?: string } {
  const vinLimpo = vin.trim();

  if (vinLimpo.length !== 17) {
    return { valido: false, motivo: `VIN deve ter 17 caracteres (recebido: ${vinLimpo.length})` };
  }
  
  if (!/^[A-Z0-9]{17}$/i.test(vinLimpo)) {
    return { valido: false, motivo: "VIN deve conter apenas letras e números" };
  }
  
  return { valido: true };
}

/**
 * Extrai o VIN a partir do conteúdo bruto do QR Code.
 * Remove espaços e hífens. Extrai a sequência de 17 caracteres alfanuméricos.
 */
export function extrairVinDoQr(conteudoBruto: string): string {
  const bruto = conteudoBruto.trim();

  // Tenta JSON
  try {
    const json = JSON.parse(bruto);
    if (json && typeof json.vin === "string") {
      const vin = json.vin.replace(/[\s-]/g, "");
      const match = vin.match(/[A-Za-z0-9]{17}/);
      if (match) return match[0];
      return vin;
    }
  } catch {}

  // Remove espaços e hífens
  const limpo = bruto.replace(/[\s-]/g, "");

  // Procura por 17 caracteres alfanuméricos contínuos (ex: #VIN123... -> extrai apenas os 17 chars)
  const match = limpo.match(/[A-Za-z0-9]{17}/);
  if (match) {
    return match[0];
  }

  // Fallback: usa o conteúdo limpo inteiro
  return limpo;
}

export function normalizarCodigoBarras(vin: string): string {
  return vin;
}
