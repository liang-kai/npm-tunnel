export interface FileChunk {
  index: number;
  data: Buffer | Blob;
  hash: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
  transferCode: string;
  createdAt: string;
  expiresAt: string;
} 