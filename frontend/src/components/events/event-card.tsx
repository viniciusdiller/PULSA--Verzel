import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCentsToBRL, formatEventDate } from "@/lib/format";
import type { EventSummary } from "@/types/event";

// h-full em cada camada (motion.div → Link → Card) faz o card ocupar
// toda a altura que o Swiper reservou pra fileira (a do card mais alto
// visível) — sem isso, um título de 1 linha deixava espaço vazio solto
// embaixo em vez de ficar do mesmo tamanho dos vizinhos. O título usa
// line-clamp-2 + altura mínima reservada pras 2 linhas, então 1 ou 2
// linhas de título sempre ocupam o mesmo espaço, e o preço fica sempre
// colado no rodapé (mt-auto) — o card nunca muda de "formato" conforme
// o texto do evento.
export function EventCard({ event }: { event: EventSummary }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
      <Link href={`/events/${event.id}`} className="group flex h-full flex-col">
        <Card className="flex h-full flex-col overflow-hidden py-0 shadow-card transition-shadow duration-300 group-hover:border-foreground/30 group-hover:shadow-card-hover">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <span className="font-heading text-2xl">{event.title.slice(0, 1)}</span>
              </div>
            )}
          </div>
          <CardContent className="flex flex-1 flex-col gap-1 py-4">
            <p className="truncate text-xs tracking-wide text-muted-foreground uppercase">
              {event.venueCity} • {formatEventDate(event.startsAt)}
            </p>
            <h3 className="font-heading line-clamp-2 min-h-11 text-lg leading-tight font-bold">
              {event.title}
            </h3>
            <p className="mt-auto text-sm text-muted-foreground">
              a partir de {formatCentsToBRL(event.fromPriceCents)}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
