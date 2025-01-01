import { NextApiRequest } from 'next';
import formidable from 'formidable';
import fs from 'node:fs';
import crypto from 'node:crypto';

interface FileChunk {
  index: number;
  data: Buffer;
  hash: string;
  filename: string;
  size: number;
}

export class FileChunker {
  private readonly chunkSize: number;

  constructor(chunkSize: number = 5 * 1024 * 1024) { // 默认 5MB
    this.chunkSize = chunkSize;
  }

  // 将 parseRequest 改为静态方法
  static async parseRequest(req: NextApiRequest): Promise<FileChunk[]> {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '500000000'), // 默认 500MB
    });

    const [_, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      throw new Error('No file uploaded');
    }

    // 创建新的 FileChunker 实例
    const chunker = new FileChunker(
      parseInt(process.env.CHUNK_SIZE || '5242880') // 默认 5MB
    );

    return chunker.splitFile(file);
  }

  async splitFile(file: formidable.File): Promise<FileChunk[]> {
    const chunks: FileChunk[] = [];
    const fileBuffer = await fs.promises.readFile(file.filepath);
    const totalChunks = Math.ceil(fileBuffer.length / this.chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, fileBuffer.length);
      const chunkData = fileBuffer.slice(start, end);
      
      chunks.push({
        index: i,
        data: chunkData,
        hash: this.calculateHash(chunkData),
        filename: file.originalFilename || 'unknown',
        size: file.size
      });
    }

    // 清理临时文件
    await fs.promises.unlink(file.filepath);

    return chunks;
  }

  private calculateHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
} 