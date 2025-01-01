import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, FileDown, AlertCircle, FileType } from "lucide-react"
import Link from "next/link"
import { FileMetadata } from '@file-transfer/shared'

interface DownloadStatus {
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  metadata?: FileMetadata;
  filePath?: string;
}

export default function DownloadPage() {
  const router = useRouter()
  const { code } = router.query
  const [status, setStatus] = useState<DownloadStatus>({
    status: 'pending',
    progress: 0
  })

  useEffect(() => {
    if (code) {
      startDownload(code as string)
    }
  }, [code])

  const startDownload = async (transferCode: string) => {
    try {
      // 1. 获取元数据
      const metadataRes = await fetch(`/api/download/${transferCode}/metadata`)
      if (!metadataRes.ok) {
        throw new Error('文件不存在或已过期')
      }
      const metadata = await metadataRes.json()

      setStatus({
        status: 'downloading',
        progress: 0,
        metadata
      })

      // 2. 开始下载
      const downloadRes = await fetch(`/api/download/${transferCode}/start`, {
        method: 'POST'
      })
      if (!downloadRes.ok) {
        throw new Error('下载失败')
      }

      const data = await downloadRes.json()
      setStatus({
        status: 'completed',
        progress: 100,
        metadata,
        filePath: data.filePath
      })
    } catch (error) {
      setStatus({
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : '下载失败'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">文件下载</h1>

          <Card className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <FileDown className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-semibold mb-2">
                  传输码: {code}
                </h2>
                {status.metadata && (
                  <p className="text-gray-500">
                    {status.metadata.name} ({(status.metadata.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Progress value={status.progress} className="w-full" />

              {status.status === 'completed' && (
                <Alert className="bg-green-50 border-green-200">
                  <FileType className="h-4 w-4 text-green-500" />
                  <AlertTitle>下载完成</AlertTitle>
                  <AlertDescription>
                    文件已保存到: {status.filePath}
                  </AlertDescription>
                </Alert>
              )}

              {status.status === 'failed' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>下载失败</AlertTitle>
                  <AlertDescription>
                    {status.error || '请稍后重试'}
                  </AlertDescription>
                </Alert>
              )}

              {['pending', 'downloading'].includes(status.status) && (
                <div className="text-sm text-gray-500">
                  <p>下载进度：{status.progress}%</p>
                  {status.status === 'downloading' && (
                    <p>正在下载文件，请稍候...</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
} 