import { FileChunk, FileMetadata } from '@file-transfer/shared';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface ChunkInfo {
  index: string;
  version: string;
}

export class NpmDownloader {
  private readonly registry: string;
  private readonly authToken: string;
  private readonly tempDir: string;
  private readonly basePackageName = 'build-core-part-tow';

  constructor(registry: string, authToken: string) {
    this.registry = registry;
    this.authToken = authToken;
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async downloadFile(transferCode: string, targetPath: string): Promise<void> {
    try {
      // 1. 获取统筹包的元数据
      const metadata = await this.getMetadata(transferCode);
      if (!metadata) {
        throw new Error('文件不存在或已过期');
      }

      // 2. 下载所有分片
      const chunks = await this.downloadChunks(metadata);

      // 3. 合并文件
      await this.mergeChunks(chunks, targetPath, metadata);

      // 4. 清理临时文件
      await this.cleanup();
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async getMetadata(transferCode: string): Promise<FileMetadata | null> {
    try {
      // 1. 创建临时目录
      const packageDir = path.join(this.tempDir, 'coordinator');
      await fs.promises.mkdir(packageDir, { recursive: true });

      // 2. 创建 .npmrc
      await this.createNpmrc(packageDir);

      // 3. 尝试获取包信息
      const version = `0.0.0-alpha.${transferCode}`;
      const result = await execAsync(
        `npm view ${this.basePackageName}@${version} customData --json`,
        {
          cwd: packageDir,
          env: { ...process.env, npm_config_registry: this.registry }
        }
      );

      const data = JSON.parse(result.stdout);
      return data?.metadata || null;
    } catch (error) {
      console.error('获取元数据失败:', error);
      return null;
    }
  }

  private async downloadChunks(metadata: FileMetadata): Promise<FileChunk[]> {
    const chunks: FileChunk[] = new Array(metadata.totalChunks);
    const { transferCode } = metadata;

    // 并行下载所有分片，但限制并发数
    const concurrency = 3;
    const chunkIndexes = Array.from({ length: metadata.totalChunks }, (_, i) => i);
    
    for (let i = 0; i < chunkIndexes.length; i += concurrency) {
      const batch = chunkIndexes.slice(i, i + concurrency);
      await Promise.all(
        batch.map(index => this.downloadChunk(transferCode, index, chunks))
      );
    }

    // 验证所有分片是否下载成功
    const missingChunks = chunks.findIndex(chunk => !chunk);
    if (missingChunks !== -1) {
      throw new Error(`分片 ${missingChunks} 下载失败`);
    }

    return chunks;
  }

  private async downloadChunk(
    transferCode: string, 
    index: number, 
    chunks: FileChunk[]
  ): Promise<void> {
    const chunkDir = path.join(this.tempDir, `chunk-${index}`);
    await fs.promises.mkdir(chunkDir, { recursive: true });

    try {
      // 1. 创建 .npmrc
      await this.createNpmrc(chunkDir);

      // 2. 下载分片包
      const version = `0.0.0-chunks.${transferCode}.${String(index).padStart(2, '0')}`;
      await execAsync(
        `npm pack ${this.basePackageName}-sub@${version}`,
        {
          cwd: chunkDir,
          env: { ...process.env, npm_config_registry: this.registry }
        }
      );

      // 3. 解压分片包
      const tarFile = (await fs.promises.readdir(chunkDir))
        .find(file => file.endsWith('.tgz'));
      
      if (!tarFile) {
        throw new Error('分片包下载失败');
      }

      await execAsync(`tar -xzf ${tarFile}`, { cwd: chunkDir });

      // 4. 读取分片数据
      const chunkData = await fs.promises.readFile(
        path.join(chunkDir, 'package/chunk.bin')
      );

      // 5. 保存到数组
      chunks[index] = {
        index,
        data: chunkData,
        hash: '' // 如果需要验证，可以计算hash
      };
    } catch (error) {
      console.error(`下载分片 ${index} 失败:`, error);
      throw error;
    }
  }

  private async mergeChunks(
    chunks: FileChunk[], 
    targetPath: string,
    metadata: FileMetadata
  ): Promise<void> {
    // 1. 确保目标目录存在
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    // 2. 创建写入流
    const writeStream = fs.createWriteStream(targetPath);

    try {
      // 3. 按顺序写入每个分片
      for (const chunk of chunks) {
        await new Promise<void>((resolve, reject) => {
          writeStream.write(chunk.data, error => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
    } finally {
      // 4. 关闭写入流
      await new Promise(resolve => writeStream.end(resolve));
    }

    // 5. 验证文件大小
    const stats = await fs.promises.stat(targetPath);
    if (stats.size !== metadata.size) {
      throw new Error('文件合并后大小不匹配');
    }
  }

  private async createNpmrc(dir: string): Promise<void> {
    const npmrcPath = path.join(dir, '.npmrc');
    const npmrcContent = [
      `registry=${this.registry}`,
      `${this.registry.replace('http:', '')}/:_authToken=${this.authToken}`,
      'always-auth=true'
    ].join('\n');

    await fs.promises.writeFile(npmrcPath, npmrcContent);
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.promises.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
} 