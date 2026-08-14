"use client";

import { cn } from "@/lib/utils";
import { formatCentsToBRL } from "@/lib/format";
import type { Seat, SeatMapResponse } from "@/types/event";

function groupSeatsByRow(seats: Seat[]): Map<string, Seat[]> {
  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    const existing = rows.get(seat.row) ?? [];
    existing.push(seat);
    rows.set(seat.row, existing);
  }
  for (const rowSeats of rows.values()) {
    rowSeats.sort((a, b) => a.number - b.number);
  }
  return rows;
}

export function SeatMap({
  seatMap,
  pendingSeatId,
  disabled,
  onSelectSeat,
}: {
  seatMap: SeatMapResponse;
  pendingSeatId?: string | null;
  disabled?: boolean;
  onSelectSeat: (seat: Seat) => void;
}) {
  return (
    <div className="w-full">
      <div className="mx-auto mb-10 h-2 w-2/3 rounded-full bg-muted" />
      <p className="mb-8 text-center text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Palco
      </p>

      <div className="space-y-10">
        {seatMap.sections.map((section) => {
          const sectionSeats = seatMap.seats.filter((s) => s.sectionId === section.id);
          const rows = groupSeatsByRow(sectionSeats);

          return (
            <div key={section.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-lg">{section.name}</h3>
                <span className="text-sm text-muted-foreground">
                  {formatCentsToBRL(section.priceCents)}
                </span>
              </div>

              <div className="space-y-1.5">
                {Array.from(rows.entries()).map(([row, seats]) => (
                  <div key={row} className="flex items-center gap-1.5">
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">{row}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {seats.map((seat) => {
                        const isPending = seat.id === pendingSeatId;
                        const isAvailable = seat.status === "AVAILABLE";

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            title={seat.label}
                            disabled={!isAvailable || disabled || isPending}
                            onClick={() => onSelectSeat(seat)}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-sm text-[10px] transition-colors",
                              isAvailable &&
                                !disabled &&
                                "border border-amber-500/50 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
                              seat.status === "HELD" &&
                                "cursor-not-allowed bg-muted text-muted-foreground/50",
                              seat.status === "SOLD" &&
                                "cursor-not-allowed bg-muted/50 text-muted-foreground/30",
                              isPending && "bg-amber-500 text-black",
                            )}
                          >
                            {seat.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-amber-500/50" /> Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-muted" /> Reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-muted/50" /> Vendido
        </span>
      </div>
    </div>
  );
}
