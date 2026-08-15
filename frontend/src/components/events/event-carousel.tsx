"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/navigation";

import { EventCard } from "@/components/events/event-card";
import { cn } from "@/lib/utils";
import type { EventSummary } from "@/types/event";

// Carrossel genérico de cards de evento — substitui a grade estática em
// toda seção da home (grid vira scroll horizontal com setas). Usa o
// mesmo EventCard de sempre, só muda o container. As setas somem
// sozinhas quando não há mais o que rolar pra aquele lado (isBeginning/
// isEnd do Swiper), em vez de ficarem clicáveis sem fazer nada.
export function EventCarousel({ events, className }: { events: EventSummary[]; className?: string }) {
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);

  if (events.length === 0) return null;

  function syncEdges(s: SwiperInstance) {
    setIsBeginning(s.isBeginning);
    setIsEnd(s.isEnd);
  }

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation]}
        onSwiper={(s) => {
          setSwiper(s);
          syncEdges(s);
        }}
        onSlideChange={syncEdges}
        onResize={syncEdges}
        onBreakpoint={syncEdges}
        // No mobile mostra 1 card inteiro + uma fatia do próximo — deixa
        // óbvio que dá pra arrastar, em vez de parecer uma grade cortada.
        slidesPerView={1.15}
        spaceBetween={16}
        breakpoints={{
          480: { slidesPerView: 1.5, spaceBetween: 16 },
          640: { slidesPerView: 2.5, spaceBetween: 20 },
          1024: { slidesPerView: 4, spaceBetween: 24 },
        }}
        className="!pb-1"
      >
        {events.map((event) => (
          <SwiperSlide key={event.id} className="!h-auto">
            <EventCard event={event} />
          </SwiperSlide>
        ))}
      </Swiper>

      {!isBeginning && (
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => swiper?.slidePrev()}
          className="absolute top-1/2 -left-3 z-10 hidden size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card text-foreground shadow-card ring-1 ring-border hover:bg-muted sm:flex"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {!isEnd && (
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => swiper?.slideNext()}
          className="absolute top-1/2 -right-3 z-10 hidden size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card text-foreground shadow-card ring-1 ring-border hover:bg-muted sm:flex"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
