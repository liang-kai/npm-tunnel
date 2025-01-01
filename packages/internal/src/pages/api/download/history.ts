import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const records = []
    const transferCodes = await fs.promises.readdir(DOWNLOADS_DIR)

    for (const code of transferCodes) {
      const metadataPath = path.join(DOWNLOADS_DIR, code, 'metadata.json')
      if (await fs.promises.stat(metadataPath)) {
        const metadata = JSON.parse(
          await fs.promises.readFile(metadataPath, 'utf-8')
        )
        records.push({
          transferCode: code,
          metadata,
          status: 'completed',
          downloadedAt: new Date().toISOString() // 实际应该从文件状态获取
        })
      }
    }

    res.status(200).json(records)
  } catch (error) {
    console.error('获取历史记录失败:', error)
    res.status(500).json({ error: 'Failed to get history' })
  }
} 