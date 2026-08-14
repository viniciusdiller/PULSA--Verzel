import Link from "next/link";
import { Button } from "@/components/ui/button";

// Adaptação honesta do "baixe o app" do guia de marca: o produto não
// tem app mobile, mas tem um fluxo real de organizador — a plataforma
// também não tem cadastro público (login só com conta semeada), então
// o texto não promete "crie sua conta grátis", só direciona quem já
// tem acesso de organizador.
export function CtaBand() {
  return (
    <section className="rounded-2xl bg-violet px-8 py-12 text-center text-violet-foreground sm:px-16">
      <h2 className="font-heading text-2xl font-bold sm:text-3xl">
        Tem um show, festa ou evento esportivo pra organizar?
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-violet-foreground/85">
        Organizadores publicam eventos com mapa de assentos configurável direto
        na PULSA. Entre com sua conta de organizador para começar.
      </p>
      <Button
        asChild
        size="lg"
        variant="secondary"
        className="mt-6 bg-background text-foreground hover:bg-background/90 active:bg-background/80"
      >
        <Link href="/login">Entrar como organizador</Link>
      </Button>
    </section>
  );
}
