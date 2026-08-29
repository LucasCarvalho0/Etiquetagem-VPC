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
 *   TRIM#VIN  →  ex: "153595#94DFCAP15VUB200465"
 *   O chassi vem sempre APÓS o símbolo '#'.
 *
 * Estratégias (em ordem):
 * 1. JSON com campo "vin"
 * 2. Conteúdo após '#' que tenha 17 chars alfanuméricos
 * 3. Sequência de 17 chars que começa com letra (WMI sempre começa com letra)
 * 4. Últimos 17 alfanuméricos (fallback para prefixos numéricos sem separador)
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

  // 2. Formato CAMPO#VIN — extrai tudo após o último '#'
  if (bruto.includes("#")) {
    const partes = bruto.split("#");
    // Pega a última parte (ou a que tiver 17 chars alphanumeric)
    for (let i = partes.length - 1; i >= 0; i--) {
      const candidato = partes[i].replace(/[\s\-_]/g, "").toUpperCase();
      if (/^[A-Z0-9]{17}$/.test(candidato)) return candidato;
      // Se tiver mais de 17, pega os primeiros 17 que começam com letra
      const match = candidato.match(/[A-Z][A-Z0-9]{16}/);
      if (match) return match[0];
    }
  }

  // 3. Remove separadores e busca 17 chars começando com letra (padrão VIN oficial)
  const limpo = bruto.replace(/[\s\-_#]/g, "").toUpperCase();
  const matchLetra = limpo.match(/[A-Z][A-Z0-9]{16}/);
  if (matchLetra) return matchLetra[0];

  // 4. Fallback: últimos 17 alfanuméricos
  const soAlpha = limpo.replace(/[^A-Z0-9]/g, "");
  if (soAlpha.length >= 17) return soAlpha.slice(-17);

  return soAlpha;
}

export function normalizarCodigoBarras(vin: string): string {
  return vin;
}
