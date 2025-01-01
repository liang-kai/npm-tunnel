import { NextApiRequest, NextApiResponse } from 'next'
import { FileChunker } from '@/lib/file/chunker'
import { NpmPublisher } from '@/lib/npm/publisher'
import formidable from 'formidable'
import { FileMetadata } from '@file-transfer/shared'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '500000000'),
    })
    
    const [fields, files] = await form.parse(req)
    const file = files.file?.[0]

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const chunker = new FileChunker(
      parseInt(process.env.CHUNK_SIZE || '5242880')
    )

    // 生成传输码
    const transferCode = Math.floor(1000 + Math.random() * 9000).toString()

    // 分片文件
    const chunks = await chunker.splitFile(file)

    // 创建元数据
    const metadata: FileMetadata = {
      name: file.originalFilename || 'unknown',
      size: file.size,
      type: file.mimetype || 'application/octet-stream',
      totalChunks: chunks.length,
      transferCode,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    }

    // 发布到 NPM
    const publisher = new NpmPublisher(
      process.env.NPM_REGISTRY,
      process.env.NPM_TOKEN
    )

    await publisher.publishFile(chunks, metadata)

    res.status(200).json({ 
      success: true, 
      transferCode,
      metadata 
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    })
  }
} 