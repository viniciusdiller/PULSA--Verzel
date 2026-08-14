import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCentsToBRL, formatEventDate } from "@/lib/format";
import type { EventSummary } from "@/types/event";

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link href={`/events/${event.id}`} className="group block">
        <Card className="overflow-hidden py-0 shadow-card transition-shadow duration-300 group-hover:border-foreground/30 group-hover:shadow-card-hover">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
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
          <CardContent className="space-y-1 py-4">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {event.venueCity} • {formatEventDate(event.startsAt)}
            </p>
            <h3 className="font-heading text-lg leading-tight font-bold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">
              a partir de {formatCentsToBRL(event.fromPriceCents)}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
