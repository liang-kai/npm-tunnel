export interface TransferStatus {
  code: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface TransferConfig {
  maxFileSize: number;
  chunkSize: number;
  expiryHours: number;
} 