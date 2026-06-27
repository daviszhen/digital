import type { CollectionConfig } from 'payload'

export const DigitalAssets: CollectionConfig = {
  slug: 'digital-assets',
  admin: {
    group: 'Shop',
    useAsTitle: 'filename',
  },
  access: {
    read: () => true,
    create: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'filename',
      type: 'text',
      required: true,
      label: 'File Name',
    },
    {
      name: 'fileSize',
      type: 'number',
      required: true,
      label: 'File Size',
    },
    {
      name: 'mimeType',
      type: 'text',
      required: true,
      label: 'MIME Type',
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'File',
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Product',
      hasMany: false,
      index: true,
    },
    {
      name: 'downloadCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
      label: 'Download Count',
    },
    {
      name: 'maxDownloads',
      type: 'number',
      defaultValue: 5,
      min: 1,
      label: 'Max Downloads',
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      label: 'Expires At',
    },
  ],
}
