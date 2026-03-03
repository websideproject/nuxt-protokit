import type { ComputedRef } from 'vue'

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'write'

export interface PermissionContext {
  /** Roles the current user holds, resolved by configureProtoPermissions */
  roles: string[]
  /** The action being evaluated */
  action: PermissionAction
  /** Collection key, if applicable */
  collection?: string
  /** Field key, if applicable */
  field?: string
}

/**
 * Defines who is allowed to perform an action.
 *
 * - `string`   — user must hold this exact role
 * - `string[]` — user must hold **at least one** of these roles
 * - `function` — fully custom check; receives the full {@link PermissionContext}
 *
 * Omitting a guard means **allow** (open access).
 */
export type PermissionGuard =
  | string
  | string[]
  | ((ctx: PermissionContext) => boolean)

/**
 * Per-collection permission guards.
 *
 * Applied at the UI layer by useProtoCollection / usePrototype.
 * For real enforcement, also protect your API endpoints.
 */
export interface CollectionPermissions {
  /** Whether the collection UI is rendered at all. */
  read?: PermissionGuard
  /** Whether the "add item" control is enabled. */
  create?: PermissionGuard
  /** Whether item edit controls are enabled. */
  update?: PermissionGuard
  /** Whether item delete controls are enabled. */
  delete?: PermissionGuard
}

/**
 * Per-field permission guards.
 *
 * ⚠️  **Frontend only** — the underlying Y.js document value is always
 * present in the browser. A determined user can read or write it through
 * devtools or the raw CRDT API. Field-level permissions are a UX
 * convenience, not a security boundary.
 */
export interface FieldPermissions {
  /**
   * When the guard resolves to `false` the field is **hidden** from the UI.
   * The value still exists in the Y.js document.
   */
  read?: PermissionGuard
  /**
   * When the guard resolves to `false` the field is rendered **read-only**.
   * The value can still be written directly to the Y.js document.
   */
  write?: PermissionGuard
}

/** Reactive permission flags for a single collection (returned by composables). */
export interface CollectionPermissionsResolved {
  canRead: ComputedRef<boolean>
  canCreate: ComputedRef<boolean>
  canUpdate: ComputedRef<boolean>
  canDelete: ComputedRef<boolean>
}

/** Reactive permission flags for a single field (returned by composables). */
export interface FieldPermissionsResolved {
  canRead: ComputedRef<boolean>
  canWrite: ComputedRef<boolean>
}
