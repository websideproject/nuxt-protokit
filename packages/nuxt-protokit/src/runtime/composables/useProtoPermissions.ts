import { computed } from 'vue'
import type {
  PermissionGuard,
  PermissionContext,
  PermissionAction,
  CollectionPermissions,
  FieldPermissions,
  CollectionPermissionsResolved,
  FieldPermissionsResolved,
} from '../types/permissions'

// ── Module-level singleton ────────────────────────────────────────────────────
// Stored at module scope so a single call to configureProtoPermissions() in a
// plugin is enough to configure the whole app.
let _resolveRoles: (() => string | string[]) | null = null

/**
 * Configure the global role resolver used by all permission guards.
 *
 * Call **once** — typically in a client-side Nuxt plugin — before any
 * component that uses permission-aware composables is mounted.
 *
 * @example
 * ```ts
 * // plugins/permissions.client.ts
 * export default defineNuxtPlugin(() => {
 *   configureProtoPermissions({
 *     resolveRoles: () => useAuthUser().value?.roles ?? [],
 *   })
 * })
 * ```
 *
 * ⚠️  **Frontend guard only.** All checks run in the browser. A user who
 * understands the underlying Y.js CRDT can bypass field-level (and even
 * collection-level) guards via devtools. Protect sensitive operations with
 * server-side access control as well.
 */
export function configureProtoPermissions(config: {
  resolveRoles: () => string | string[]
}): void {
  _resolveRoles = config.resolveRoles
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getRoles(): string[] {
  if (!_resolveRoles) return []
  const r = _resolveRoles()
  return Array.isArray(r) ? r : r ? [r] : []
}

function checkGuard(
  guard: PermissionGuard | undefined,
  ctx: Omit<PermissionContext, 'roles'>,
): boolean {
  if (guard === undefined || guard === null) return true
  const roles = getRoles()
  const fullCtx: PermissionContext = { ...ctx, roles }
  if (typeof guard === 'function') return guard(fullCtx)
  if (typeof guard === 'string') return roles.includes(guard)
  if (Array.isArray(guard)) return guard.some(r => roles.includes(r))
  return true
}

// ── Public composable ─────────────────────────────────────────────────────────

/**
 * Access low-level permission checking utilities.
 *
 * Normally you do not need to call this directly — `useProtoCollection`,
 * `useProtoMap`, and `usePrototype` all expose pre-resolved reactive
 * `permissions` / `fieldPermissions` objects derived from the schema.
 *
 * Use `useProtoPermissions` when you need to perform ad-hoc checks or build
 * custom UI logic around the current user's roles.
 *
 * ⚠️  **Frontend guard only.** See {@link configureProtoPermissions}.
 */
export function useProtoPermissions() {
  /**
   * Check whether the current user can perform `action` on a collection.
   * Returns `true` when `permissions` is undefined (no guard = allow all).
   */
  function can(
    action: 'read' | 'create' | 'update' | 'delete',
    permissions: CollectionPermissions | undefined,
    ctx: { collection?: string } = {},
  ): boolean {
    if (!permissions) return true
    return checkGuard(permissions[action as keyof CollectionPermissions], {
      action: action as PermissionAction,
      ...ctx,
    })
  }

  /**
   * Check whether the current user can read or write a specific field.
   * Returns `true` when `permissions` is undefined (no guard = allow all).
   */
  function canField(
    action: 'read' | 'write',
    permissions: FieldPermissions | undefined,
    ctx: { collection?: string, field?: string } = {},
  ): boolean {
    if (!permissions) return true
    return checkGuard(permissions[action], {
      action: action as PermissionAction,
      ...ctx,
    })
  }

  /**
   * Build a reactive {@link CollectionPermissionsResolved} object from a
   * {@link CollectionPermissions} definition.
   */
  function resolveCollectionPermissions(
    permissions: CollectionPermissions | undefined,
    collection?: string,
  ): CollectionPermissionsResolved {
    return {
      canRead: computed(() => can('read', permissions, { collection })),
      canCreate: computed(() => can('create', permissions, { collection })),
      canUpdate: computed(() => can('update', permissions, { collection })),
      canDelete: computed(() => can('delete', permissions, { collection })),
    }
  }

  /**
   * Build a reactive {@link FieldPermissionsResolved} object from a
   * {@link FieldPermissions} definition.
   */
  function resolveFieldPermissions(
    fieldPerms: FieldPermissions | undefined,
    ctx: { collection?: string, field?: string } = {},
  ): FieldPermissionsResolved {
    return {
      canRead: computed(() => canField('read', fieldPerms, ctx)),
      canWrite: computed(() => canField('write', fieldPerms, ctx)),
    }
  }

  /** Returns the current user's roles as resolved by configureProtoPermissions. */
  function getRolesPublic(): string[] {
    return getRoles()
  }

  return {
    can,
    canField,
    getRoles: getRolesPublic,
    resolveCollectionPermissions,
    resolveFieldPermissions,
  }
}
