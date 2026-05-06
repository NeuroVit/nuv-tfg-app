import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    color?: string
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

type ChartContainerProps = React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, style, ...props }, ref) => {
    const chartId = React.useId().replace(/:/g, '')
    const containerId = `chart-${id ?? chartId}`

    const chartVars = Object.entries(config).reduce<Record<string, string>>((vars, [key, value]) => {
      if (value.color) {
        vars[`--color-${key}`] = value.color
      }
      return vars
    }, {})

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={containerId}
          ref={ref}
          className={cn(
            'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-item-text]:text-foreground [&_.recharts-pie-label-text]:fill-foreground [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border [&_.recharts-sector:focus-visible]:outline-none',
            className,
          )}
          style={{
            ...chartVars,
            ...style,
          }}
          {...props}
        >
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  },
)
ChartContainer.displayName = 'ChartContainer'

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  className?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  nameKey?: string
  labelKey?: string
  labelClassName?: string
  indicator?: 'dot' | 'line'
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      formatter,
      labelClassName,
      nameKey,
      labelKey,
      indicator = 'dot',
    },
    ref,
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    const firstItem = payload[0]
    const rawLabel = labelKey
      ? (firstItem?.payload as Record<string, unknown>)?.[labelKey]
      : label

    const computedLabel = labelFormatter
      ? labelFormatter(rawLabel, payload)
      : rawLabel

    return (
      <div
        ref={ref}
        className={cn('grid min-w-44 gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl', className)}
      >
        {!hideLabel && computedLabel != null ? (
          <p className={cn('font-medium text-foreground', labelClassName)}>{String(computedLabel)}</p>
        ) : null}

        <div className="grid gap-1">
          {payload.map((item, index) => {
            const key = (nameKey ?? item.name ?? item.dataKey ?? `item-${index}`) as string
            const configItem = config[key]
            const labelText = configItem?.label ?? item.name ?? item.dataKey ?? key
            const itemValue = Number(item.value ?? 0)

            return (
              <div key={`${String(item.dataKey)}-${index}`} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {!hideIndicator ? (
                    indicator === 'line' ? (
                      <span className="h-0.5 w-3" style={{ backgroundColor: item.color ?? item.fill ?? 'currentColor' }} />
                    ) : (
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ backgroundColor: item.color ?? item.fill ?? 'currentColor' }}
                      />
                    )
                  ) : null}
                  <span className="text-muted-foreground">{labelText}</span>
                </div>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {formatter
                    ? formatter(item.value ?? 0, item.name ?? key, item, index, payload)
                    : itemValue.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

const ChartLegend = RechartsPrimitive.Legend

type ChartLegendContentProps = React.ComponentProps<'div'> & Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
  nameKey?: string
  hideIcon?: boolean
}

function ChartLegendContent({ className, payload, verticalAlign = 'bottom', nameKey, hideIcon = false }: ChartLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload.map((item) => {
        const key = (nameKey ?? item.dataKey ?? item.value ?? 'item') as string
        const configItem = config[key]

        return (
          <div key={item.value} className="flex items-center gap-1.5">
            {hideIcon ? null : (
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: item.color }} />
            )}
            <span className="text-muted-foreground">{configItem?.label ?? item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent }
