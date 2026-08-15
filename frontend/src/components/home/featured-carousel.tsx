"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { EffectCoverflow, Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

import { formatEventDateTime } from "@/lib/format";
import type { EventSummary } from "@/types/event";

// Carrossel "Em destaque" — alimentado pela curadoria manual do
// organizador (Event.featured, no máx. 4 entre toda a plataforma), não
// por heurística. Baseado no padrão Skiper 47 (Swiper + coverflow), mas
// com dados reais do evento (imagem, título, local/data) em vez de fotos
// decorativas, e usando `motion/react` (já a lib de animação do projeto)
// em vez de framer-motion.
export function FeaturedCarousel({ events }: { events: EventSummary[] }) {
  if (events.length === 0) return null;

  // Coverflow precisa de slides suficientes pra não repetir a mesma
  // imagem ao dar loop — com poucos itens, simplesmente não fecha o loop.
  const canLoop = events.length >= 3;

  const overrideStyles = `
    .pulsa-featured-carousel .swiper-pagination-bullet {
      background: var(--color-muted-foreground);
      opacity: 0.5;
    }
    .pulsa-featured-carousel .swiper-pagination-bullet-active {
      background: var(--color-primary);
      opacity: 1;
    }
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <style>{overrideStyles}</style>
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Em destaque
      </p>
      <h2 className="font-heading mt-2 mb-6 text-2xl font-bold">
        Selecionado pelos organizadores
      </h2>

      <Swiper
        modules={[EffectCoverflow, Autoplay, Pagination]}
        effect="coverflow"
        grabCursor
        centeredSlides
        loop={canLoop}
        autoplay={canLoop ? { delay: 4500, disableOnInteraction: false } : false}
        slidesPerView={1.1}
        breakpoints={{
          640: { slidesPerView: 1.6 },
          1024: { slidesPerView: 2.2 },
        }}
        spaceBetween={24}
        coverflowEffect={{ rotate: 0, stretch: 0, depth: 100, modifier: 2.5, slideShadows: false }}
        pagination={{ clickable: true }}
        className="pulsa-featured-carousel !pb-12"
      >
        {events.map((event) => (
          <SwiperSlide key={event.id} className="!h-[340px]">
            <Link
              href={`/events/${event.id}`}
              className="group relative block h-full w-full overflow-hidden rounded-2xl shadow-card"
            >
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet to-[#241636]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-xs text-white/80 uppercase">
                  {event.venueCity} • {formatEventDateTime(event.startsAt)}
                </p>
                <h3 className="font-heading mt-1 text-xl font-bold text-white">{event.title}</h3>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}
