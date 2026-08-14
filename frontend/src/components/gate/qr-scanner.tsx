"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

const REGION_ID = "gate-qr-reader";

export function QrScanner({
  onDecode,
  paused,
}: {
  onDecode: (text: string) => void;
  paused: boolean;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID);
    scannerRef.current = scanner;

    // Precisamos esperar o `start()` assentar (resolver OU rejeitar) antes
    // de tentar parar — chamar `stop()` enquanto ele ainda está pendente
    // (ex.: o React Strict Mode do dev monta/desmonta o efeito na hora)
    // faz a lib rejeitar com "Cannot stop, scanner is not running or
    // paused.", e essa rejeição escapava do catch por acontecer fora da
    // cadeia de promises que tratávamos.
    const startAttempt = scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => onDecodeRef.current(decodedText),
        () => {
          // erro de "não achou QR neste frame" — esperado a cada frame sem
          // um código na mira da câmera, não é uma falha real.
        },
      )
      .then(() => true)
      .catch(() => {
        setError(
          "Não foi possível acessar a câmera. Verifique a permissão do navegador ou use a digitação manual.",
        );
        return false;
      });

    return () => {
      void startAttempt.then((started) => {
        if (started) {
          scanner
            .stop()
            .catch(() => {})
            .finally(() => scanner.clear());
        } else {
          scanner.clear();
        }
      });
    };
  }, []);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (paused && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      scanner.pause(true);
    } else if (!paused && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
      scanner.resume();
    }
  }, [paused]);

  if (error) {
    return <p className="text-center text-sm text-muted-foreground">{error}</p>;
  }

  return (
    <div
      id={REGION_ID}
      className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg bg-black"
    />
  );
}
