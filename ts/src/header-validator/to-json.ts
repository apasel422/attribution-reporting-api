import * as parsed from './validate-json'

type MaybeHasField<K extends string, V> = {
  [key in K]?: V
}

function ifNotNull<K extends string, U, V>(
  key: K,
  u: U | null,
  f: (u: U) => V
): MaybeHasField<K, V> {
  const obj: MaybeHasField<K, V> = {}
  if (u !== null) {
    obj[key] = f(u)
  }
  return obj
}

type CommonDebug = {
  debug_key?: string
  debug_reporting: boolean
}

function serializeCommonDebug(c: parsed.CommonDebug): CommonDebug {
  return {
    ...ifNotNull('debug_key', c.debugKey, (v) => v.toString()),
    debug_reporting: c.debugReporting,
  }
}

type Priority = {
  priority: string
}

function serializePriority(p: parsed.Priority): Priority {
  return { priority: p.priority.toString() }
}

type KeyPiece = {
  key_piece: string
}

function serializeKeyPiece(p: parsed.KeyPiece): KeyPiece {
  return { key_piece: `0x${p.keyPiece.toString(16)}` }
}

type AggregatableDebugReportingData = KeyPiece & {
  types: string[]
  value: number
}

function serializeAggregatableDebugReportingData(
  d: parsed.AggregatableDebugReportingData
): AggregatableDebugReportingData {
  return {
    ...serializeKeyPiece(d),

    types: Array.from(d.types),
    value: d.value,
  }
}

type AggregatableDebugReportingConfig = KeyPiece & {
  aggregation_coordinator_origin: string
  debug_data: AggregatableDebugReportingData[]
}

function serializeAggregatableDebugReportingConfig(
  d: parsed.AggregatableDebugReportingConfig
): AggregatableDebugReportingConfig {
  return {
    ...serializeKeyPiece(d),

    aggregation_coordinator_origin: d.aggregationCoordinatorOrigin,
    debug_data: Array.from(
      d.debugData,
      serializeAggregatableDebugReportingData
    ),
  }
}

type EventReportWindows = {
  event_report_windows: { start_time: number; end_times: number[] }
}

function serializeEventReportWindows(
  e: parsed.EventReportWindows
): EventReportWindows {
  return {
    event_report_windows: {
      start_time: e.startTime,
      end_times: [...e.endTimes],
    },
  }
}

type TriggerData = {
  trigger_data: number[]
}

function serializeTriggerData(d: Set<number>): TriggerData {
  return { trigger_data: Array.from(d) }
}

type TriggerSpec = EventReportWindows &
  TriggerData & {
    summary_buckets: number[]
    summary_operator: string
  }

function serializeTriggerSpec(ts: parsed.TriggerSpec): TriggerSpec {
  return {
    ...serializeEventReportWindows(ts.eventReportWindows),
    ...serializeTriggerData(ts.triggerData),

    summary_buckets: Array.from(ts.summaryBuckets),
    summary_operator: ts.summaryOperator,
  }
}

type SourceAggregatableDebugReportingConfig =
  AggregatableDebugReportingConfig & {
    budget: number
  }

function serializeSourceAggregatableDebugReportingConfig(
  d: parsed.SourceAggregatableDebugReportingConfig
): SourceAggregatableDebugReportingConfig {
  return {
    ...serializeAggregatableDebugReportingConfig(d),

    budget: d.budget,
  }
}

type NotFullFlexSource = Partial<EventReportWindows> & {
  trigger_data: number[]
  trigger_specs?: never
}

type FullFlexSource = {
  event_report_windows?: never
  trigger_data?: never
  trigger_specs: TriggerSpec[]
}

function serializeFlexSource(
  s: parsed.Source,
  fullFlex: boolean
): NotFullFlexSource | FullFlexSource {
  if (fullFlex) {
    return {
      trigger_specs: Array.from(s.triggerSpecs, serializeTriggerSpec),
    }
  }

  if (s.triggerSpecs.length === 0) {
    return { trigger_data: [] }
  }

  if (s.triggerSpecs.length === 1) {
    return {
      ...serializeEventReportWindows(s.triggerSpecs[0]!.eventReportWindows),
      ...serializeTriggerData(s.triggerSpecs[0]!.triggerData),
    }
  }

  throw new TypeError()
}

type Source = CommonDebug &
  Priority &
  (NotFullFlexSource | FullFlexSource) & {
    aggregation_keys: { [key: string]: string }
    aggregatable_report_window: number
    destination: string[]
    destination_limit_priority: string
    event_level_epsilon: number
    expiry: number
    filter_data: { [key: string]: string[] }
    max_event_level_reports: number
    source_event_id: string
    trigger_data_matching: string
    aggregatable_debug_reporting?: SourceAggregatableDebugReportingConfig
    attribution_scopes?: string[]
    attribution_scope_limit?: number
    max_event_states?: number
  }

export interface Options {
  fullFlex?: boolean | undefined
  scopes?: boolean | undefined
}

export function serializeSource(
  s: parsed.Source,
  opts: Readonly<Options>
): string {
  const scopeFields = opts.scopes
    ? {
        attribution_scopes: Array.from(s.attributionScopes),
        ...ifNotNull(
          'attribution_scope_limit',
          s.attributionScopeLimit,
          (v) => v
        ),
        max_event_states: s.maxEventStates,
      }
    : {}

  const source: Source = {
    ...serializeCommonDebug(s),
    ...serializePriority(s),
    ...serializeFlexSource(s, opts.fullFlex ?? false),

    aggregation_keys: Object.fromEntries(
      Array.from(s.aggregationKeys.entries(), ([key, val]) => [
        key,
        `0x${val.toString(16)}`,
      ])
    ),

    filter_data: Object.fromEntries(
      Array.from(s.filterData.entries(), ([key, vals]) => [
        key,
        Array.from(vals),
      ])
    ),

    aggregatable_report_window: s.aggregatableReportWindow,
    destination: Array.from(s.destination),
    destination_limit_priority: s.destinationLimitPriority.toString(),
    event_level_epsilon: s.eventLevelEpsilon,
    expiry: s.expiry,
    max_event_level_reports: s.maxEventLevelReports,
    source_event_id: s.sourceEventId.toString(),
    trigger_data_matching: s.triggerDataMatching,
    ...ifNotNull(
      'aggregatable_debug_reporting',
      s.aggregatableDebugReporting,
      (v) => serializeSourceAggregatableDebugReportingConfig(v)
    ),
    ...scopeFields,
  }

  return stringify(source)
}

type FilterConfig = {
  [key: string]: number | string[]
}

function serializeFilterConfig(fc: parsed.FilterConfig): FilterConfig {
  const obj: FilterConfig = Object.fromEntries(
    Array.from(fc.map.entries(), ([key, vals]) => [key, Array.from(vals)])
  )

  if (fc.lookbackWindow !== null) {
    obj['_lookback_window'] = fc.lookbackWindow
  }

  return obj
}

type FilterPair = {
  filters: FilterConfig[]
  not_filters: FilterConfig[]
}

function serializeFilterPair(fp: parsed.FilterPair): FilterPair {
  return {
    filters: Array.from(fp.positive, serializeFilterConfig),
    not_filters: Array.from(fp.negative, serializeFilterConfig),
  }
}

type DedupKey = {
  deduplication_key?: string
}

function serializeDedupKey(fp: parsed.DedupKey): DedupKey {
  return ifNotNull('deduplication_key', fp.dedupKey, (v) => v.toString())
}

type EventTriggerDatum = FilterPair &
  Priority &
  DedupKey & {
    trigger_data: string
    value?: number
  }

function serializeEventTriggerDatum(
  d: parsed.EventTriggerDatum,
  fullFlex: boolean
): EventTriggerDatum {
  const obj: EventTriggerDatum = {
    ...serializeFilterPair(d),
    ...serializePriority(d),
    ...serializeDedupKey(d),

    trigger_data: d.triggerData.toString(),
  }

  if (fullFlex) {
    obj.value = d.value
  }

  return obj
}

type AggregatableDedupKey = FilterPair & DedupKey

function serializeAggregatableDedupKey(
  d: parsed.AggregatableDedupKey
): AggregatableDedupKey {
  return {
    ...serializeFilterPair(d),
    ...serializeDedupKey(d),
  }
}

type AggregatableTriggerDatum = FilterPair &
  KeyPiece & {
    source_keys: string[]
  }

function serializeAggregatableTriggerDatum(
  d: parsed.AggregatableTriggerDatum
): AggregatableTriggerDatum {
  return {
    ...serializeFilterPair(d),
    ...serializeKeyPiece(d),

    source_keys: Array.from(d.sourceKeys),
  }
}

type AggregatableValues = {
  [key: string]: {
    value: number
    filtering_id: string
  }
}

type AggregatableValuesConfiguration = FilterPair & {
  values: AggregatableValues
}

function serializeAggregatableValuesConfiguration(
  c: parsed.AggregatableValuesConfiguration
): AggregatableValuesConfiguration {
  const values: AggregatableValues = {}
  for (const [key, value] of c.values.entries()) {
    values[key] = {
      value: value.value,
      filtering_id: value.filteringId.toString(),
    }
  }
  return {
    ...serializeFilterPair(c),
    values,
  }
}

type Trigger = CommonDebug &
  FilterPair & {
    aggregatable_deduplication_keys: AggregatableDedupKey[]
    aggregatable_source_registration_time: string
    aggregatable_trigger_data: AggregatableTriggerDatum[]
    aggregatable_filtering_id_max_bytes: number
    aggregatable_values: AggregatableValuesConfiguration[]
    aggregation_coordinator_origin: string
    event_trigger_data: EventTriggerDatum[]
    trigger_context_id?: string
    aggregatable_debug_reporting?: AggregatableDebugReportingConfig
    attribution_scopes?: string[]
  }

export function serializeTrigger(
  t: parsed.Trigger,
  opts: Readonly<Options>
): string {
  const scopeFields = opts.scopes
    ? {
        attribution_scopes: Array.from(t.attributionScopes),
      }
    : {}

  const trigger: Trigger = {
    ...serializeCommonDebug(t),
    ...serializeFilterPair(t),

    aggregatable_deduplication_keys: Array.from(
      t.aggregatableDedupKeys,
      serializeAggregatableDedupKey
    ),

    aggregatable_source_registration_time: t.aggregatableSourceRegistrationTime,

    aggregatable_trigger_data: Array.from(
      t.aggregatableTriggerData,
      serializeAggregatableTriggerDatum
    ),

    aggregatable_filtering_id_max_bytes: t.aggregatableFilteringIdMaxBytes,

    aggregatable_values: Array.from(
      t.aggregatableValuesConfigurations,
      serializeAggregatableValuesConfiguration
    ),

    aggregation_coordinator_origin: t.aggregationCoordinatorOrigin,

    event_trigger_data: Array.from(t.eventTriggerData, (d) =>
      serializeEventTriggerDatum(d, opts.fullFlex ?? false)
    ),

    ...ifNotNull('trigger_context_id', t.triggerContextID, (v) => v),

    ...ifNotNull(
      'aggregatable_debug_reporting',
      t.aggregatableDebugReporting,
      (v) => serializeAggregatableDebugReportingConfig(v)
    ),

    ...scopeFields,
  }

  return stringify(trigger)
}

function stringify(v: object): string {
  return JSON.stringify(v, /*replacer=*/ null, '  ')
}
