import { Lock, QrCode, Radio } from "lucide-react";

// Conteúdo editorial honesto sobre capacidades REAIS já implementadas —
// não números/depoimentos inventados (isso seria exatamente o tipo de
// "AI slop"/prova social falsa que o desafio pede pra evitar).
const ITEMS = [
  {
    Icon: QrCode,
    title: "Ingresso verificável",
    body: "Cada ingresso carrega um código assinado, único e impossível de forjar — a portaria confirma a validade na hora, sem depender de terceiros.",
  },
  {
    Icon: Radio,
    title: "Portaria em tempo real",
    body: "Assim que um ingresso é validado na entrada, ele vira \"utilizado\" imediatamente — uma segunda tentativa com o mesmo código é bloqueada na hora.",
  },
  {
    Icon: Lock,
    title: "Assento garantido",
    body: "Ao escolher seu lugar, ele fica reservado só para você por alguns minutos. O sistema impede que duas pessoas comprem o mesmo assento ao mesmo tempo.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="grid gap-6 sm:grid-cols-3">
      {ITEMS.map(({ Icon, title, body }) => (
        <div key={title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <Icon className="size-6 text-violet" strokeWidth={1.75} />
          <h3 className="font-heading mt-4 text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        </div>
      ))}
    </section>
  );
}
