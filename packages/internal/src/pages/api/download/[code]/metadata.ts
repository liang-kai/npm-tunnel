import { NextApiRequest, NextApiResponse } from 'next'
import { NpmDownloader } from '@/lib/npm/downloader'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid transfer code' })
  }

  try {
    const downloader = new NpmDownloader(
      process.env.NPM_REGISTRY || '',
      process.env.NPM_TOKEN || ''
    )

    const metadata = await downloader.getMetadata(code)
    res.status(200).json(metadata)
  } catch (error) {
    console.error('Failed to get metadata:', error)
    res.status(500).json({ error: 'Failed to get file metadata' })
  }
} 