import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | PULSA",
  description: "O que a PULSA coleta, como usa e como isso é armazenado no seu navegador.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      <div className="mt-2 space-y-2 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Legal</p>
      <h1 className="font-heading mt-1 text-3xl text-foreground">Política de privacidade</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        A PULSA é um projeto de demonstração construído para um desafio técnico de vaga de
        emprego — não é uma empresa nem processa pagamento real. Ainda assim, esta página descreve
        com exatidão o que o site coleta e como usa, do jeito que uma plataforma real deveria
        documentar.
      </p>

      <Section title="O que coletamos no cadastro">
        <p>
          Nome, email e senha (guardada só como hash bcrypt — nunca em texto puro, nem por nós).
          Contas de organizador, cliente e portaria já vêm semeadas pro desafio; não existe
          cadastro público neste projeto.
        </p>
      </Section>

      <Section title="Armazenamento local (localStorage), não cookies de rastreamento">
        <p>
          O site usa <code>localStorage</code> do navegador pra três coisas, todas essenciais pro
          funcionamento:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Seu token de login e dados básicos da conta, pra manter você conectado.</li>
          <li>Sua preferência de tema (claro/escuro).</li>
          <li>A escolha que você fez neste aviso de cookies, pra não perguntar de novo.</li>
        </ul>
        <p>
          Nenhum desses três é enviado a terceiros. Não usamos Google Analytics, pixel de
          Facebook, ou qualquer ferramenta de rastreamento — hoje não existe nenhum cookie
          opcional pra aceitar ou recusar de verdade.
        </p>
      </Section>

      <Section title="Pagamento">
        <p>
          O pagamento é simulado: nenhum número de cartão real é processado, cobrado ou
          armazenado. Guardamos só os 4 últimos dígitos do número de teste usado, pra exibir no
          histórico do ingresso.
        </p>
      </Section>

      <Section title="APIs externas">
        <p>
          Buscamos eventos e filmes reais na Ticketmaster Discovery e no TMDb pra o organizador
          montar o catálogo. As chaves dessas APIs ficam só no servidor — o seu navegador nunca
          fala diretamente com elas.
        </p>
      </Section>

      <Section title="Seus dados não são vendidos nem compartilhados">
        <p>
          Não compartilhamos, vendemos ou repassamos seus dados a terceiros. O único
          compartilhamento que existe é o que você pede explicitamente: o link de um ingresso
          (mostra assento e QR pra quem você mandar o link, sem seu nome ou email).
        </p>
      </Section>

      <Section title="Mudanças nesta política">
        <p>Como é um projeto de demonstração, esta página pode mudar sem aviso prévio.</p>
      </Section>
    </main>
  );
}
