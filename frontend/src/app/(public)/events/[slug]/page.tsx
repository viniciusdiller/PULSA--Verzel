export default async function EventDetailPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-3xl">Detalhe do evento</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Placeholder do Dia 1 (evento {slug}) — mapa de assentos chega no
        Dia 4.
      </p>
    </main>
  );
}
