import { NextApiRequest, NextApiResponse } from 'next'
import { NpmPublisher } from '@/lib/npm/publisher'
import { FileChunker } from '@/lib/file/chunker'
import { generateTransferCode } from '@/lib/utils'
import { FileMetadata } from '@file-transfer/shared'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // 1. 解析文件数据
    const chunks = await FileChunker.parseRequest(req)
    if (!chunks || chunks.length === 0) {
      throw new Error('No file data received')
    }

    // 2. 生成传输码
    const transferCode = generateTransferCode()

    // 3. 创建元数据
    const metadata: FileMetadata = {
      transferCode,
      name: chunks[0].filename,
      size: chunks[0].size,
      totalChunks: chunks.length,
      timestamp: new Date().toISOString()
    }

    // 4. 发布到 NPM
    const publisher = new NpmPublisher(
      process.env.NPM_REGISTRY || '',
      process.env.NPM_TOKEN || ''
    )

    await publisher.publishFile(metadata, chunks)

    // 5. 返回成功结果
    res.status(200).json({ 
      success: true, 
      data: {
        transferCode,
        name: metadata.name,
        size: metadata.size
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    })
  }
} 