import { NextApiRequest, NextApiResponse } from 'next'
import { NpmDownloader } from '@/lib/npm/downloader'
import { SyncService } from '@/services/sync'
import path from 'path'

// 创建下载服务实例
const downloader = new NpmDownloader(
  process.env.NPM_REGISTRY || '',
  process.env.NPM_TOKEN || ''
)

const syncService = new SyncService(
  downloader,
  '*/5 * * * *', // 每5分钟检查一次
  path.join(process.cwd(), 'downloads')
)

// 启动同步服务
syncService.start()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid transfer code' })
  }

  try {
    // 添加下载任务
    await syncService.addTask(code)
    res.status(200).json({ message: 'Download started' })
  } catch (error) {
    console.error('启动下载失败:', error)
    res.status(500).json({ error: 'Failed to start download' })
  }
} 