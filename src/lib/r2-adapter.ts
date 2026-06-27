// @ts-nocheck
import type { CollectionConfig } from 'payload'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import path from 'path'

const createS3Client = () => {
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  })
}

const getBucket = () => process.env.S3_BUCKET || ''

interface S3AdapterArgs {
  collection: CollectionConfig
  prefix?: string
}

export const s3Adapter =
  ({ collection, prefix }: S3AdapterArgs): any => {
    const client = createS3Client()

    return {
      name: 's3-r2',
      fields: [],
      generateURL: ({ filename, prefix: sizePrefix }) => {
        const filePrefix = sizePrefix || prefix || ''
        const key = filePrefix ? path.posix.join(filePrefix, filename) : filename
        return Promise.resolve(`${process.env.S3_FILE_URL || ''}/${key}`)
      },
      handleUpload: async ({ data, file }) => {
        const filePrefix = prefix || ''
        const key = filePrefix ? path.posix.join(filePrefix, data.filename!) : data.filename!

        await client.send(
          new PutObjectCommand({
            Bucket: getBucket(),
            Key: key,
            Body: file.buffer,
            ContentType: data.mimeType!,
          })
        )
        return data
      },
      handleDelete: async ({ filename }) => {
        const filePrefix = prefix || ''
        const key = filePrefix ? path.posix.join(filePrefix, filename) : filename

        await client.send(
          new DeleteObjectCommand({
            Bucket: getBucket(),
            Key: key,
          })
        )
      },
      staticHandler: async (req, res) => {
        const filePrefix = prefix || ''
        const key = filePrefix
          ? path.posix.join(filePrefix, req.params.filename)
          : req.params.filename

        try {
          const command = new GetObjectCommand({
            Bucket: getBucket(),
            Key: key,
          })
          const url = await getSignedUrl(client, command, { expiresIn: 3600 })
          res.redirect(url)
        } catch {
          res.status(404).send('File not found')
        }
      },
    }
  }
