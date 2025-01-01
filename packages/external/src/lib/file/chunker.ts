import { FileChunk } from '@file-transfer/shared';
import crypto from 'crypto';
import fs from 'fs';
import { File as FormidableFile } from 'formidable';

export class FileChunker {
  private readonly chunkSize: number;

  constructor(chunkSize: number = 5 * 1024 * 1024) { // 默认 5MB 一个块
    this.chunkSize = chunkSize;
  }

  async splitFile(file: FormidableFile): Promise<FileChunk[]> {
    const chunks: FileChunk[] = [];
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    const fileBuffer = await fs.promises.readFile(file.filepath);

    for (let index = 0; index < totalChunks; index++) {
      const start = index * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunkBuffer = fileBuffer.slice(start, end);
      
      // 计算chunk的hash
      const hash = crypto
        .createHash('sha256')
        .update(chunkBuffer)
        .digest('hex');
      
      chunks.push({
        index,
        data: chunkBuffer,
        hash
      });
    }

    // 清理临时文件
    await fs.promises.unlink(file.filepath);

    return chunks;
  }
} 