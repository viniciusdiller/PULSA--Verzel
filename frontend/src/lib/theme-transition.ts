// Reveal em círculo crescendo a partir de um ponto (o botão de tema)
// quando o tema muda, usando a View Transitions API nativa — sem
// framer-motion/motion, é só Web Animations API (browser cuida do
// rasterizar antes/depois). Inspirado no padrão Skiper 26, simplificado:
// aqui só existe uma variante (círculo, a partir do ponto de clique), e
// o conteúdo novo sempre fica por cima crescendo — sem precisar trocar
// z-index conforme a direção claro↔escuro, o que mantém o efeito
// idêntico nos dois sentidos.
export function runThemeTransition(origin: { x: number; y: number }, applyChange: () => void) {
  if (
    !("startViewTransition" in document) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyChange();
    return;
  }

  const { x, y } = origin;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(applyChange);

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // Transição abortada (ex. troca de tema muito rápida em sequência)
      // — o tema já foi aplicado por applyChange(), só a animação some.
    });
}
