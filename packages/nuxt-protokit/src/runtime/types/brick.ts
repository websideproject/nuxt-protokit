// --- Section Definition ---

export interface SectionDef {
  title: string
  icon?: string
  description?: string
  fields: string[] // keys into PrototypeSchema.fields
  cols?: 1 | 2 | 3 | 4
  collapsible?: boolean
  defaultOpen?: boolean
}

// --- Result Section ---

export interface ResultSectionDef {
  title: string
  icon?: string
  showWhen?: (ctx: import('./compute').ComputeContext) => boolean
  badge?: (ctx: import('./compute').ComputeContext) => { label: string, color: string } | null
  stats: (ctx: import('./compute').ComputeContext) => Array<{
    label: string
    value: string | number
    subLabel?: string
    valueClass?: string
    bgClass?: string
  }>
  statCols?: 2 | 3 | 4
}

// --- Card Definition ---

export interface CardDef {
  title: string
  icon?: string
  description?: string
  stats?: (ctx: import('./compute').ComputeContext) => Array<{
    label: string
    value: string | number
    valueClass?: string
  }>
  badge?: (ctx: import('./compute').ComputeContext) => { label: string, color: string } | null
  footer?: string
}

// --- Visualization Definitions ---

export type VizType = 'progress' | 'benchmark' | 'bar-chart' | 'line-chart' | 'area-chart' | 'pie-chart' | 'donut-chart' | 'funnel-chart' | 'stat-cards' | 'comparison-table' | 'feature-matrix' | 'timeline'

export interface BuiltInVizDef {
  type: VizType
  title?: string
  showWhen?: (ctx: import('./compute').ComputeContext) => boolean
  config: VizProgressConfig | VizBenchmarkConfig | VizBarChartConfig | VizLineChartConfig | VizAreaChartConfig | VizPieChartConfig | VizFunnelChartConfig | VizStatCardsConfig | VizComparisonTableConfig | VizFeatureMatrixConfig | VizTimelineConfig
}

export interface CustomVizDef {
  type: `${string}:${string}`
  title?: string
  showWhen?: (ctx: import('./compute').ComputeContext) => boolean
  config?: Record<string, any>
}

export type VizDef = BuiltInVizDef | CustomVizDef

export interface VizProgressConfig {
  type: 'progress'
  value: (ctx: import('./compute').ComputeContext) => number
  max?: number
  label?: (ctx: import('./compute').ComputeContext) => string
  thresholds?: Array<{ value: number, color: string, label?: string }>
}

export interface VizBenchmarkConfig {
  type: 'benchmark'
  value: (ctx: import('./compute').ComputeContext) => number
  median: number
  min?: number
  max?: number
  label?: string
  unit?: string
}

export interface VizBarChartConfig {
  type: 'bar-chart'
  data: (ctx: import('./compute').ComputeContext) => Array<{ label: string, value: number, color?: string }>
  maxValue?: number
  unit?: string
}

export interface VizLineChartConfig {
  type: 'line-chart'
  data: (ctx: import('./compute').ComputeContext) => Array<{ label: string, value: number }>
  color?: string
  showAxes?: boolean
  unit?: string
  emptyText?: string
}

export interface VizComparisonTableConfig {
  type: 'comparison-table'
  columns: Array<{ key: string, label: string }>
  rows: (ctx: import('./compute').ComputeContext) => Array<Record<string, any>>
}

export interface VizFeatureMatrixConfig {
  type: 'feature-matrix'
  features: string[]
  entities: (ctx: import('./compute').ComputeContext) => Array<{
    name: string
    coverage: Record<string, boolean | 'partial'>
  }>
}

export interface VizTimelineConfig {
  type: 'timeline'
  items: (ctx: import('./compute').ComputeContext) => Array<{
    title: string
    description?: string
    date?: string
    status?: 'done' | 'current' | 'upcoming'
    icon?: string
  }>
}

export interface VizAreaChartConfig {
  type: 'area-chart'
  series: (ctx: import('./compute').ComputeContext) => Array<{
    label: string
    data: Array<{ label: string, value: number }>
    color?: string
  }>
  showAxes?: boolean
  unit?: string
  emptyText?: string
}

export interface VizPieChartConfig {
  type: 'pie-chart' | 'donut-chart'
  data: (ctx: import('./compute').ComputeContext) => Array<{ label: string, value: number, color?: string }>
  unit?: string
  showLegend?: boolean
  emptyText?: string
}

export interface VizFunnelChartConfig {
  type: 'funnel-chart'
  data: (ctx: import('./compute').ComputeContext) => Array<{ label: string, value: number, color?: string }>
  unit?: string
  showConversion?: boolean
}

export interface VizStatCardsConfig {
  type: 'stat-cards'
  cards: (ctx: import('./compute').ComputeContext) => Array<{
    label: string
    value: string | number
    subLabel?: string
    trend?: number
    trendLabel?: string
    unit?: string
    icon?: string
    color?: 'primary' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'neutral'
    sparkline?: number[]
  }>
  cols?: 1 | 2 | 3 | 4
}

// --- Collection Calendar Config ---

export interface CollectionCalendarConfig {
  /** Field holding the primary date value (e.g. 'plannedDate'). */
  dateField: string
  /** Field to use as the event title (e.g. 'title'). */
  titleField: string
  /** Custom id field; defaults to '_id'. */
  idField?: string
  /** Optional separate end-date field. */
  endDateField?: string
  /** Optional time field for timed events (HH:mm, e.g. 'plannedTime'). */
  timeField?: string
  /** Optional end-time field (HH:mm, e.g. 'plannedEndTime'). */
  endTimeField?: string
  /** Boolean field indicating all-day; when absent, events default to all-day. */
  allDayField?: string
  /** Map item status values to CalendarColor names. */
  statusColorMap?: Record<string, import('../types/calendar').CalendarColor>
  /** Fallback color when no status matches. Defaults to 'neutral'. */
  defaultColor?: import('../types/calendar').CalendarColor
}

// --- Dashboard Layout ---

export interface DashboardTabDef {
  id: string
  label: string
  icon?: string
  badge?: (ctx: import('./compute').ComputeContext) => { label: string, color: string } | null
  rows: LayoutRow[]
}

export interface DashboardLayout {
  rows?: LayoutRow[]
  tabs?: DashboardTabDef[]
}

export interface LayoutRow {
  cols: 1 | 2 | 3 | 4
  gap?: number
  items: LayoutItem[]
}

export interface InlineTabDef {
  id: string
  label: string
  icon?: string
  items: LayoutItem[]
}

export type LayoutItem
  = | { type: 'form', sectionIndex?: number, span?: number }
    | { type: 'stats', resultIndex: number, span?: number }
    | { type: 'viz', vizIndex: number, span?: number }
    | { type: 'card', cardIndex: number, span?: number }
    | { type: 'collection', collectionKey: string, view: 'list' | 'table', span?: number }
    | { type: 'collection', collectionKey: string, view: 'calendar', calendarConfig: CollectionCalendarConfig, span?: number }
    | { type: 'section', title: string, items: LayoutItem[], span?: number }
    | { type: 'tabs', tabs: InlineTabDef[], span?: number }
