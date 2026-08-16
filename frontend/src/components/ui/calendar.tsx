"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type ChevronProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months: "relative flex flex-col gap-4 sm:flex-row",
    month: "w-full",
    month_caption:
      "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
    caption_label: "font-heading text-sm font-medium",
    nav: "absolute top-0 z-10 flex w-full justify-between",
    button_previous: cn(
      buttonVariants({ variant: "ghost", size: "icon-sm" }),
      "text-muted-foreground hover:text-foreground"
    ),
    button_next: cn(
      buttonVariants({ variant: "ghost", size: "icon-sm" }),
      "text-muted-foreground hover:text-foreground"
    ),
    weekday: "size-9 p-0 text-xs font-medium text-muted-foreground",
    day_button:
      "relative flex size-9 items-center justify-center rounded-full p-0 text-sm text-foreground outline-offset-2 transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 group-data-selected:bg-primary group-data-selected:text-primary-foreground group-data-selected:hover:bg-primary-hover group-data-disabled:pointer-events-none group-data-disabled:text-muted-foreground group-data-disabled:line-through group-data-outside:text-muted-foreground",
    day: "group size-9 p-0 text-sm",
    today: "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-1 *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-primary group-data-selected:*:after:bg-primary-foreground",
    outside:
      "text-muted-foreground data-selected:bg-accent/50 data-selected:text-muted-foreground",
    hidden: "invisible",
    week_number: "size-9 p-0 text-xs font-medium text-muted-foreground",
  }

  const mergedClassNames: typeof defaultClassNames = Object.keys(
    defaultClassNames
  ).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames]
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames
  )

  const defaultComponents = {
    Chevron: (chevronProps: ChevronProps) => {
      if (chevronProps.orientation === "left") {
        return <ChevronLeft className="size-4" aria-hidden />
      }
      return <ChevronRight className="size-4" aria-hidden />
    },
  }

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
