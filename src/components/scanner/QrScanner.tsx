"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onLeitura: (conteudo: string) => void;
  ativo: boolean;
}

const ELEMENT_ID = "qr-reader-vpc";

export function QrScanner({ onLeitura, ativo }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ultimaLeituraRef = useRef<{ texto: string; timestamp: number } | null>(null);
  // Guardamos sempre a versão mais recente do callback sem colocá-lo nas deps do effect
  const onLeituraRef = useRef(onLeitura);
  useEffect(() => { onLeituraRef.current = onLeitura; }, [onLeitura]);

  useEffect(() => {
    if (!ativo) return;

    let cancelado = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelado) return;

      const scanner = new Html5Qrcode(ELEMENT_ID);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (textoDecodificado) => {
            const agora = Date.now();
            const ultima = ultimaLeituraRef.current;
            // Evita leituras duplicadas repetidas em sequência (debounce de 2s)
            if (ultima && ultima.texto === textoDecodificado && agora - ultima.timestamp < 2000) {
              return;
            }
            ultimaLeituraRef.current = { texto: textoDecodificado, timestamp: agora };
            onLeituraRef.current(textoDecodificado);
          },
          () => {
            // erro de leitura por frame — ignorado (comum durante o foco da câmera)
          }
        );
      } catch (e) {
        setErro("Não foi possível acessar a câmera. Verifique as permissões do tablet.");
      }
    })();

    return () => {
      cancelado = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [ativo]);

  return (
    <div className="w-full">
      <div id={ELEMENT_ID} className="w-full overflow-hidden rounded-lg border" />
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
    </div>
  );
}
