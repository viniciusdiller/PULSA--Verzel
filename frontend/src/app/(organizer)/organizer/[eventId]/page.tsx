export default async function OrganizerEventDetailPage(
  props: PageProps<"/organizer/[eventId]">,
) {
  const { eventId } = await props.params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-3xl">Gerenciar evento</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Placeholder do Dia 1 (evento {eventId}) — mapa de assentos e vendas
        chegam nos próximos dias.
      </p>
    </main>
  );
}
