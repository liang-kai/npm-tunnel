import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, FileDown, Clock } from "lucide-react"
import Link from "next/link"
import { FileMetadata } from '@file-transfer/shared'

interface DownloadRecord {
  transferCode: string;
  metadata: FileMetadata;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  downloadedAt?: string;
  error?: string;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<DownloadRecord[]>([])

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/download/history')
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (error) {
      console.error('获取历史记录失败:', error)
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

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">下载历史</h1>

          <div className="space-y-4">
            {records.map(record => (
              <Card key={record.transferCode} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded">
                    <FileDown className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {record.metadata.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      {record.downloadedAt || '未完成'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-2 py-1 rounded ${
                      record.status === 'completed' ? 'bg-green-100 text-green-700' :
                      record.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {record.status === 'completed' ? '已完成' :
                       record.status === 'failed' ? '失败' :
                       record.status === 'downloading' ? '下载中' : '等待中'}
                    </span>
                    {record.status === 'failed' && (
                      <Link href={`/download/${record.transferCode}`}>
                        <Button size="sm">重试</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {records.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                暂无下载记录
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 