import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Download, History, FileDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/router"

export default function Home() {
  const [transferCode, setTransferCode] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (transferCode) {
      router.push(`/download/${transferCode}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">文件传输桥</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            输入传输码下载文件，或查看历史记录
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileDown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>输入传输码</CardTitle>
                  <CardDescription>
                    输入4位传输码开始下载文件
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="输入4位传输码"
                  value={transferCode}
                  onChange={e => setTransferCode(e.target.value)}
                  maxLength={4}
                  pattern="\d{4}"
                  className="text-center text-2xl tracking-wider"
                />
                <Button className="w-full" size="lg" type="submit">
                  <Download className="mr-2 h-5 w-5" />
                  开始下载
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <History className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>下载历史</CardTitle>
                  <CardDescription>
                    查看最近的下载记录和状态
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/history">
                <Button variant="outline" className="w-full">
                  查看历史记录
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 