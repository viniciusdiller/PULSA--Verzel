export default async function CheckoutPage(props: PageProps<"/events/[slug]/checkout">) {
  const { slug } = await props.params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-3xl">Checkout</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Placeholder do Dia 1 (evento {slug}) — hold, contador e pagamento
        simulado chegam no Dia 4.
      </p>
    </main>
  );
}
