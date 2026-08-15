"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { formatEventDateTime } from "@/lib/format";
import type { EventSummary } from "@/types/event";

// O evento mais próximo entre os publicados — heurística de fallback
// para quando nenhum organizador escolheu eventos para o carrossel "Em
// destaque" (FeaturedCarousel, curadoria manual via Event.featured). O
// backend já ordena por startsAt asc, então "o mais próximo" é real, não
// um sorteio nem um evento fixo.
export function HeroEvent({ event }: { event: EventSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl shadow-card"
    >
      <div className="relative aspect-[16/10] w-full sm:aspect-[3/1]">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet to-[#241636]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">
            Não perca
          </p>
          <h2 className="font-heading mt-2 text-3xl font-bold text-white sm:text-5xl">
            {event.title}
          </h2>
          <p className="mt-2 text-white/85">
            {event.venueCity} • {formatEventDateTime(event.startsAt)}
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href={`/events/${event.id}`}>Ver ingressos</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
