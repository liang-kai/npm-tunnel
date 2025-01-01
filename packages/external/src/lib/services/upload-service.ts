import { TransferStatus } from '@file-transfer/shared';

export class UploadService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = '/api/upload';
  }

  async uploadFile(
    file: File,
    onProgress: (status: TransferStatus) => void
  ): Promise<string> {
    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file);

      // 更新状态：开始处理
      onProgress({
        code: '',
        status: 'processing',
        progress: 0
      });

      // 发送请求
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // 更新状态：完成
      onProgress({
        code: data.transferCode,
        status: 'completed',
        progress: 100
      });

      return data.transferCode;
    } catch (error) {
      onProgress({
        code: '',
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : '上传失败'
      });
      throw error;
    }
  }
} 