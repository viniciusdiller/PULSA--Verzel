export default async function SharedTicketPage(props: PageProps<"/t/[shareSlug]">) {
  const { shareSlug } = await props.params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-3xl">Ingresso compartilhado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Placeholder do Dia 1 (slug {shareSlug}) — QR real chega no Dia 4.
      </p>
    </main>
  );
}
