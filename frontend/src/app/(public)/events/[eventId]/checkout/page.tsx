export default async function CheckoutPage(props: PageProps<"/events/[eventId]/checkout">) {
  const { eventId } = await props.params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-3xl">Checkout</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Placeholder (evento {eventId}) — mapa de assentos, hold, contador e
        pagamento simulado chegam na próxima etapa.
      </p>
    </main>
  );
}
