/**
 * ProtoCrudList and ProtoForm, rendered with stand-ins for the Nuxt UI components:
 * - edit / remove act on the right item while a search filters the list
 * - collection and field permission guards hide and lock the built-in controls
 */
import { afterEach, describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import ProtoCrudList from '../../src/runtime/components/ProtoCrudList.vue'
import ProtoForm from '../../src/runtime/components/ProtoForm.vue'
import { configureProtoPermissions } from '../../src/runtime/composables/useProtoPermissions'
import type { CollectionSchema, FieldDef } from '../../src/runtime/types/schema'

const wrapper = (tag: string) => defineComponent({
  setup: (_, { slots }) => () => h(tag, slots.default?.()),
})
const nothing = defineComponent({ setup: () => () => null })

const stubs = {
  UButton: defineComponent({
    props: { icon: String },
    emits: ['click'],
    setup: (props, { slots, emit }) => () => h('button', { 'data-icon': props.icon, 'onClick': () => emit('click') }, slots.default?.()),
  }),
  UInput: defineComponent({
    props: { modelValue: [String, Number] },
    emits: ['update:modelValue'],
    setup: (props, { emit }) => () => h('input', {
      value: props.modelValue,
      onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
    }),
  }),
  UIcon: nothing,
  UBadge: wrapper('span'),
  UCard: wrapper('div'),
  UModal: nothing,
  UFormField: wrapper('label'),
  ProtoCrudInlineForm: nothing,
  ProtoCrudModal: nothing,
  ProtoFieldText: defineComponent({
    props: { modelValue: String },
    setup: props => () => h('input', { 'value': props.modelValue, 'data-field': '' }),
  }),
}

afterEach(() => {
  configureProtoPermissions({ resolveRoles: () => [] })
})

const competitors: CollectionSchema = {
  key: 'competitors',
  title: 'Competitors',
  itemLabel: c => c.name,
  searchable: true,
  fields: { name: { type: 'text', label: 'Name', default: '' } },
  defaults: { name: '' },
}
const items = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }, { id: 3, name: 'Gamma' }]

describe('ProtoCrudList', () => {
  it('removes the searched-for item, not the one at its position in the filtered list', async () => {
    const list = mount(ProtoCrudList, { props: { schema: competitors, items }, global: { components: stubs } })

    await list.find('input').setValue('gam')
    expect(list.text()).toContain('Gamma')
    expect(list.text()).not.toContain('Alpha')

    await list.find('button[data-icon="i-lucide-x"]').trigger('click')
    expect(list.emitted('remove')).toEqual([[2]])
  })

  it('hides add / edit / delete for a role without them, and the whole list without read', async () => {
    const role = ref('viewer')
    configureProtoPermissions({ resolveRoles: () => [role.value] })
    const schema: CollectionSchema = {
      ...competitors,
      permissions: { read: ['viewer', 'admin'], create: 'admin', update: 'admin', delete: 'admin' },
    }

    const list = mount(ProtoCrudList, { props: { schema, items }, global: { components: stubs } })
    expect(list.text()).toContain('Alpha')
    expect(list.find('button[data-icon="i-lucide-plus"]').exists()).toBe(false)
    expect(list.find('button[data-icon="i-lucide-pencil"]').exists()).toBe(false)
    expect(list.find('button[data-icon="i-lucide-x"]').exists()).toBe(false)

    role.value = 'admin'
    await nextTick()
    expect(list.find('button[data-icon="i-lucide-plus"]').exists()).toBe(true)
    expect(list.findAll('button[data-icon="i-lucide-x"]')).toHaveLength(3)

    role.value = 'guest'
    await nextTick()
    expect(list.text()).toBe('')
  })
})

describe('ProtoForm', () => {
  it('hides a field the role cannot read and locks one it cannot write', () => {
    configureProtoPermissions({ resolveRoles: () => ['viewer'] })
    const fields: Record<string, FieldDef> = {
      budget: { type: 'text', label: 'Budget', default: '', permissions: { read: 'admin' } },
      owner: { type: 'text', label: 'Owner', default: '', permissions: { write: 'admin' } },
      title: { type: 'text', label: 'Title', default: '' },
    }
    const model = { budget: ref(''), owner: ref(''), title: ref('') }

    const form = mount(ProtoForm, { props: { fields, model }, global: { components: stubs } })
    const labels = form.findAll('label')
    expect(labels).toHaveLength(2) // budget is not rendered
    expect(labels[0].find('fieldset').attributes('disabled')).toBeDefined() // owner is locked
    expect(labels[1].find('fieldset').attributes('disabled')).toBeUndefined()
  })
})
