// --- Compute Context ---

export interface ComputeContext {
  fields: Record<string, any>
  derived: Record<string, any>
  connections: Record<string, any>
  collections: Record<string, any[]>
}

// --- Derived Value Definition ---

export interface DerivedDef {
  deps?: string[]
  compute: (ctx: ComputeContext) => any
  format?: 'money' | 'percent' | 'number' | 'date' | ((v: any) => string)
}

// --- Cross-doc Connections ---

export interface ConnectionsDef {
  // Keys are connection names, values define the source
  [connectionName: string]: {
    sourceDocKey: string
    sourceMapKey: string
    fields: string[]
  }
}
