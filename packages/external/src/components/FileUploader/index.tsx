import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Upload, File } from 'lucide-react'
import { TransferStatus } from '@file-transfer/shared'
import { UploadService } from '@/lib/services/upload-service'

interface FileUploaderProps {
  onStatusChange: (status: TransferStatus) => void;
}

export default function FileUploader({ onStatusChange }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const uploadService = new UploadService()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
    disabled: isUploading
  })

  const handleUpload = async () => {
    if (!file || isUploading) return

    setIsUploading(true)
    try {
      await uploadService.uploadFile(file, onStatusChange)
    } catch (error) {
      console.error('上传失败:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? (
            "释放鼠标上传文件"
          ) : (
            "拖拽文件到此处，或点击选择文件"
          )}
        </p>
      </div>

      {file && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <File className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <Button 
            onClick={handleUpload} 
            className="w-full"
            size="lg"
          >
            开始上传
          </Button>
        </div>
      )}
    </div>
  )
} 