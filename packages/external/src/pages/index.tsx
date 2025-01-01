import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowUpFromLine, Globe, FileUp, FileQuestion } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">文件传输桥</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            安全便捷的内外网文件传输解决方案，支持大文件传输，无需繁琐的邮件流程
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>开始上传</CardTitle>
                  <CardDescription>
                    支持拖拽上传或选择文件，自动生成传输码
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/upload" className="block">
                <Button className="w-full" size="lg">
                  <ArrowUpFromLine className="mr-2 h-5 w-5" />
                  上传文件
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Globe className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>支持大文件</CardTitle>
                    <CardDescription>
                      突破邮件附件限制，轻松传输大文件
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <FileQuestion className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>使用说明</CardTitle>
                    <CardDescription>
                      查看详细的使用教程和注意事项
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="mt-16 text-center text-sm text-gray-500">
          <p>文件将在上传成功后保存3天，请及时在内网下载</p>
        </div>
      </main>
    </div>
  )
} 