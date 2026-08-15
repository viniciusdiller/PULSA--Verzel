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

  // Mantém a ref sincronizada num efeito em vez de durante o render —
  // mutar uma ref no corpo do componente é o padrão "latest ref" pra
  // evitar closure velha no scanner (que só chama isso muito depois, de
  // forma assíncrona), mas a call em si precisa ficar fora do render.
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

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
        {
          fps: 10,
          // Causa raiz do "retângulo menor do que devia": a lib só
          // aplica `width` em px no <video> (igual ao container) e
          // deixa a altura em "auto" — sem isso, ela assume a proporção
          // NATIVA da câmera (tipicamente 16:9), então dentro do nosso
          // container quadrado (aspect-square) o vídeo de verdade virava
          // uma faixa curta (ex.: 320×180) colada no topo, sobrando uma
          // área preta enorme embaixo — a moldura em L (desenhada por
          // cima, cobrindo o quadrado inteiro) prometia uma área de
          // leitura que boa parte nem tinha vídeo, só preto. Por isso o
          // QR não lia mesmo bem enquadrado: fora da faixa real de
          // vídeo, não tinha como ser capturado. `aspectRatio: 1` pede
          // pra própria câmera (via applyConstraints) entregar um stream
          // ~quadrado, preenchendo o container de verdade.
          aspectRatio: 1,
          // Quadro de leitura como função do viewfinder real (que agora
          // é de fato ~quadrado), com o mesmo respiro (16px cada lado)
          // da moldura decorativa em gate/page.tsx — os dois ficam
          // alinhados visualmente.
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.max(180, Math.min(viewfinderWidth, viewfinderHeight) - 32);
            return { width: size, height: size };
          },
        },
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
