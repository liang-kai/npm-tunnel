import { FileMetadata } from '@file-transfer/shared';

export class PackageGenerator {
  private readonly basePackageName = 'build-core-part-tow';

  generateCoordinatorPackage(metadata: FileMetadata) {
    const { transferCode } = metadata;
    // 使用 YYYY.MM.DD-alpha.X 格式
    const date = new Date();
    const version = this.generateVersion(date);
    
    return {
      name: `${this.basePackageName}`,
      version,
      private: true,
      files: ['index.json'],
      content: {
        metadata,
        chunks: Array.from({ length: metadata.totalChunks }).map((_, index) => ({
          name: `${this.basePackageName}-sub`,
          version: this.generateChunkVersion(date, transferCode, index)
        }))
      }
    };
  }

  generateChunkPackage(chunk: { index: number; hash: string }, metadata: FileMetadata) {
    const { transferCode } = metadata;
    const date = new Date();
    
    return {
      name: `${this.basePackageName}-sub`,
      version: this.generateChunkVersion(date, transferCode, chunk.index),
      private: true,
      files: ['chunk.bin'],
      content: {
        index: chunk.index,
        hash: chunk.hash,
        metadata: {
          transferCode,
          totalChunks: metadata.totalChunks,
          originalName: metadata.name,
          timestamp: date.toISOString()
        }
      }
    };
  }

  private generateVersion(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    // 获取当天的上传序号（这里用小时和分钟作为序号，实际使用时可能需要一个计数器）
    const uploadSequence = String(date.getHours() * 60 + date.getMinutes()).padStart(3, '0');
    
    return `${year}.${month}.${day}-alpha.${uploadSequence}`;
  }

  private generateChunkVersion(date: Date, transferCode: string, chunkIndex: number): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    // 使用传输码作为上传序号的一部分
    const uploadSequence = transferCode;
    // 文件块编号，使用两位数
    const chunkNumber = String(chunkIndex).padStart(2, '0');
    
    return `${year}.${month}.${day}-${uploadSequence}.${chunkNumber}`;
  }
} 