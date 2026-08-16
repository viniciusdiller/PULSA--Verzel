"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Clock } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Adaptado do componente de referência pro Brasil: relógio de 24h (sem
// AM/PM, que não é como brasileiro lê horário) e calendário/formatação
// em pt-BR (nomes de mês/dia da semana, "23 de dezembro de 2026" em vez
// de "December 23rd, 2026"). Também virou controlado (value/onChange)
// em vez de só estado interno — assim dá pra plugar direto num
// react-hook-form (mesmo padrão já usado em todo formulário do
// projeto: `<FormField render={({ field }) => <DateTimePicker
// value={field.value} onChange={field.onChange} />} />`), em vez de um
// componente de demonstração isolado.
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
const MINUTES = ["00", "15", "30", "45"]

export interface DateTimePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  disabled,
}: DateTimePickerProps) {
  // Hora/minuto vivem como strings de UI porque vêm de <Select> — só
  // viram parte da Date de verdade quando combinados com uma data já
  // escolhida (updateDateTime). Sem data ainda, ficam "prontos" (default
  // meio-dia) esperando o usuário escolher o dia no calendário.
  const [hour, setHour] = React.useState(value ? String(value.getHours()).padStart(2, "0") : "12")
  const [minute, setMinute] = React.useState(value ? String(value.getMinutes()).padStart(2, "0") : "00")

  function updateDateTime(nextDate: Date | undefined, nextHour: string, nextMinute: string) {
    if (!nextDate) {
      onChange(undefined)
      return
    }
    const combined = new Date(nextDate)
    combined.setHours(parseInt(nextHour, 10), parseInt(nextMinute, 10), 0, 0)
    onChange(combined)
  }

  function handleSelectDate(date: Date | undefined) {
    updateDateTime(date, hour, minute)
  }

  function handleChangeHour(nextHour: string) {
    setHour(nextHour)
    updateDateTime(value, nextHour, minute)
  }

  function handleChangeMinute(nextMinute: string) {
    setMinute(nextMinute)
    updateDateTime(value, hour, nextMinute)
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[220px]",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon />
            {value ? format(value, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelectDate}
            locale={ptBR}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <Select value={hour} onValueChange={handleChangeHour} disabled={disabled}>
          <SelectTrigger className="w-[68px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground">:</span>

        <Select value={minute} onValueChange={handleChangeMinute} disabled={disabled}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
