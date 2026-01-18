"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { format, parseISO } from "date-fns"

interface AnalyticsChartProps {
  data: { date: string; count: number }[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-80 items-center justify-center">
        No data available for this time period
      </div>
    )
  }

  // Fill in missing dates with zero values for a continuous line
  const filledData = fillMissingDates(data)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={filledData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            try {
              return format(parseISO(value), "MMM d")
            } catch {
              return value
            }
          }}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          dy={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}k`
            }
            return value.toString()
          }}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          fill="url(#colorViews)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: { date: string; count: number }
  }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0]

  return (
    <div className="bg-background rounded-lg border p-3 shadow-lg">
      <p className="text-muted-foreground text-sm">
        {(() => {
          try {
            return format(parseISO(data.payload.date), "MMMM d, yyyy")
          } catch {
            return data.payload.date
          }
        })()}
      </p>
      <p className="text-lg font-bold">
        {data.value.toLocaleString()} view{data.value !== 1 ? "s" : ""}
      </p>
    </div>
  )
}

// Helper function to fill in missing dates with zero values
function fillMissingDates(
  data: { date: string; count: number }[]
): { date: string; count: number }[] {
  if (data.length < 2) return data

  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const result: { date: string; count: number }[] = []
  const dataMap = new Map(sortedData.map((d) => [d.date, d.count]))

  const startDate = parseISO(sortedData[0].date)
  const endDate = parseISO(sortedData[sortedData.length - 1].date)

  let currentDate = startDate
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, "yyyy-MM-dd")
    result.push({
      date: dateStr,
      count: dataMap.get(dateStr) || 0,
    })
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
  }

  return result
}
