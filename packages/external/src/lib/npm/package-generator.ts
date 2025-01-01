import { FileMetadata } from '@file-transfer/shared';

export class PackageGenerator {
  private readonly basePackageName: string;

  constructor() {
    // 根据环境变量设置不同的包名前缀
    const isProd = process.env.NODE_ENV === 'production';
    this.basePackageName = isProd 
      ? 'build-core-part-tow'        // 生产环境包名
      : 'build-core-part-tow-test';  // 测试环境包名
  }

  generateCoordinatorPackage(metadata: FileMetadata) {
    const { transferCode } = metadata;
    const publishDate = this.getFormattedDate();
    
    return {
      name: this.basePackageName,
      version: this.generateCoordinatorVersion(transferCode),
      files: [],
      publishConfig: {
        registry: "https://registry.npmjs.org/",
        access: "public"
      },
      ftMetadata: {
        publishDate,
        type: 'coordinator',
        env: process.env.NODE_ENV || 'development'
      },
      customData: {
        metadata,
        publishDate,
        chunks: Array.from({ length: metadata.totalChunks }).map((_, index) => ({
          index: String(index).padStart(3, '0'),
          version: this.generateChunkVersion(transferCode, index)
        }))
      }
    };
  }

  generateChunkPackage(chunk: { index: number; hash: string }, metadata: FileMetadata) {
    const { transferCode } = metadata;
    const publishDate = this.getFormattedDate();
    
    return {
      name: `${this.basePackageName}-sub`,
      version: this.generateChunkVersion(transferCode, chunk.index),
      files: ['chunk.bin'],
      publishConfig: {
        registry: "https://registry.npmjs.org/",
        access: "public"
      },
      ftMetadata: {
        publishDate,
        type: 'chunk',
        env: process.env.NODE_ENV || 'development'
      },
      customData: {
        index: chunk.index,
        hash: chunk.hash,
        publishDate,
        metadata: {
          transferCode,
          totalChunks: metadata.totalChunks,
          originalName: metadata.name,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  private generateCoordinatorVersion(transferCode: string): string {
    // 使用传输码作为当天的上传识别码
    return `0.0.0-alpha.${transferCode}`;
  }

  private generateChunkVersion(transferCode: string, chunkIndex: number): string {
    // X 为上传序号（传输码），YY 为文件块编号（两位数）
    const chunkNumber = String(chunkIndex).padStart(2, '0');
    return `0.0.0-chunks.${transferCode}.${chunkNumber}`;
  }

  private getFormattedDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }
} 