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

  // "loop" do Swiper clona slides pra fingir um carrossel infinito, mas
  // precisa de bem mais slides reais do que cabem na tela pra não sobrar
  // clone vazio no meio do caminho — com só até 4 eventos em destaque e
  // 3 visíveis ao mesmo tempo, isso é exatamente o que causava o bug de
  // "às vezes não aparece nenhum card do lado". "rewind" resolve o mesmo
  // problema de UX (autoplay/setas voltam pro início ao chegar no fim)
  // sem precisar clonar nada.
  const canAutoplay = events.length > 1;

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
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
        Em destaque
      </p>

      <Swiper
        modules={[EffectCoverflow, Autoplay, Pagination]}
        effect="coverflow"
        grabCursor
        centeredSlides
        rewind={canAutoplay}
        autoplay={
          canAutoplay ? { delay: 3000, disableOnInteraction: false } : false
        }
        slidesPerView={1.15}
        breakpoints={{
          640: { slidesPerView: 2.2 },
          1024: { slidesPerView: 3 },
        }}
        spaceBetween={20}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 80,
          modifier: 1.5,
          slideShadows: false,
        }}
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
                <h3 className="font-heading mt-1 text-xl font-bold text-white">
                  {event.title}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}
