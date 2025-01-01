import { NextApiRequest, NextApiResponse } from 'next'
import { NpmDownloader } from '@/lib/npm/downloader'
import { FileMetadata } from '@file-transfer/shared'

interface StartDownloadResponse {
  success: boolean;
  data?: {
    filePath: string;
    metadata: FileMetadata;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<StartDownloadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid transfer code' 
    })
  }

  try {
    const downloader = new NpmDownloader(
      process.env.NPM_REGISTRY || '',
      process.env.NPM_TOKEN || ''
    )

    const metadata = await downloader.getMetadata(code)
    const filePath = await downloader.downloadFile(code)

    res.status(200).json({
      success: true,
      data: {
        filePath,
        metadata
      }
    })
  } catch (error) {
    console.error('Download failed:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    })
  }
} 