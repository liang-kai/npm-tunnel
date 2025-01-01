import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, FileType, AlertCircle } from "lucide-react"
import Link from "next/link"
import { FileUploader } from "@/components/FileUploader"
import { TransferStatus } from '@file-transfer/shared'

export default function UploadPage() {
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null)

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
          <h1 className="text-3xl font-bold text-center mb-8">文件上传</h1>

          <Card className="p-6">
            {!transferStatus?.code ? (
              <FileUploader onStatusChange={setTransferStatus} />
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <FileType className="h-16 w-16 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">文件上传中</h2>
                  <p className="text-gray-500">请勿关闭页面</p>
                </div>

                {transferStatus.status === 'completed' && (
                  <Alert className="bg-green-50 border-green-200">
                    <FileType className="h-4 w-4 text-green-500" />
                    <AlertTitle>上传成功</AlertTitle>
                    <AlertDescription>
                      您的传输码：<span className="font-mono font-bold">{transferStatus.code}</span>
                      <br />
                      请保存此传输码，用于在内网下载文件
                    </AlertDescription>
                  </Alert>
                )}

                {transferStatus.status === 'failed' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>上传失败</AlertTitle>
                    <AlertDescription>
                      {transferStatus.error || '请稍后重试'}
                    </AlertDescription>
                  </Alert>
                )}

                {transferStatus.status !== 'completed' && (
                  <div className="text-sm text-gray-500">
                    <p>上传进度：{transferStatus.progress}%</p>
                    {transferStatus.status === 'processing' && (
                      <p>正在处理文件，请稍候...</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="mt-8 space-y-4 text-sm text-gray-500">
            <h3 className="font-medium text-gray-900">注意事项：</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>单个文件大小限制为500MB</li>
              <li>支持的文件类型：所有类型</li>
              <li>文件将在上传成功后保存3天</li>
              <li>请妥善保管传输码，它是下载文件的唯一凭证</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
} 