import type { CollectionConfig } from 'payload'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    group: 'Shop',
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    create: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Review Title',
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: 'Review',
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      defaultValue: 5,
      label: 'Rating (1-5)',
      admin: {
        step: 1,
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'author',
      type: 'text',
      required: true,
      defaultValue: 'Anonymous',
      label: 'Your Name',
    },
    {
      name: 'isApproved',
      type: 'checkbox',
      defaultValue: true,
      label: 'Approved',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
