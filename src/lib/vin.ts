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
 *
 * Formato das etiquetas de pátio (ex: Localiza, Movida):
 *   TRIM#VINsufixo  →  ex: "153595#94DFCAP15VB200465KA"
 *   O chassi são os PRIMEIROS 17 alfanuméricos APÓS o '#'.
 *   VINs brasileiros podem começar com dígito (ex: 94...).
 *
 * Estratégias (em ordem):
 * 1. JSON com campo "vin"
 * 2. Após '#': primeiros 17 chars alfanuméricos (ignora sufixo extra)
 * 3. Fallback: primeiros 17 alfanuméricos de toda a string
 */
export function extrairVinDoQr(conteudoBruto: string): string {
  const bruto = conteudoBruto.trim();

  // 1. Tenta JSON com campo "vin"
  try {
    const json = JSON.parse(bruto);
    if (json && typeof json.vin === "string") {
      const vin = json.vin.replace(/[\s\-_#]/g, "").toUpperCase();
      const match = vin.match(/[A-Z0-9]{17}/);
      if (match) return match[0];
    }
  } catch {}

  // 2. Formato CAMPO#VIN[sufixo] — pega os primeiros 17 alfanuméricos após '#'
  if (bruto.includes("#")) {
    const partes = bruto.split("#");
    // Itera da última parte para a primeira buscando 17+ chars alfanuméricos
    for (let i = partes.length - 1; i >= 0; i--) {
      const candidato = partes[i].replace(/[\s\-_]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (candidato.length >= 17) {
        return candidato.slice(0, 17); // primeiros 17 = VIN (sufixo descartado)
      }
    }
  }

  // 3. Fallback: primeiros 17 alfanuméricos de toda a string (remove separadores)
  const soAlpha = bruto.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (soAlpha.length >= 17) return soAlpha.slice(0, 17);

  return soAlpha.toUpperCase();
}

export function normalizarCodigoBarras(vin: string): string {
  return vin;
}
