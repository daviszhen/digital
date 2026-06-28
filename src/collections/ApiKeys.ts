import type { CollectionConfig } from 'payload'

export const ApiKeys: CollectionConfig = {
  slug: 'api-keys',
  admin: {
    group: 'Settings',
    useAsTitle: 'name',
  },
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Key Name',
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ value, operation }) => {
            if (operation === 'create' || !value) {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
              let result = 'dstore_'
              for (let i = 0; i < 48; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length))
              }
              return result
            }
            return value
          },
        ],
      },
      label: 'API Key',
    },
    {
      name: 'permissions',
      type: 'select',
      required: true,
      defaultValue: 'read',
      options: [
        { label: 'Read only (search, view products)', value: 'read' },
        { label: 'Read + Write (add to cart, create orders)', value: 'write' },
        { label: 'Full access', value: 'admin' },
      ],
      label: 'Permissions',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
  ],
}
