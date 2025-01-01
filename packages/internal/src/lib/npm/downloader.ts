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
  private readonly basePackageName = 'build-core-part-tow-test';

  constructor(registry: string, authToken: string) {
    this.registry = registry;
    this.authToken = authToken;
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async downloadFile(code: string): Promise<string> {
    console.log(`[Download] Starting download for transfer code: ${code}`);
    
    const metadata = await this.getMetadata(code)
    if (!metadata) {
      throw new Error('Failed to get file metadata');
    }
    
    console.log(`[Download] File info: ${metadata.name} (${metadata.totalChunks} chunks)`);
    
    const downloadPath = path.join(process.cwd(), 'downloads', code)
    await fs.promises.mkdir(downloadPath, { recursive: true })
    
    await this.downloadChunks(code, metadata, downloadPath)
    console.log(`[Download] Successfully downloaded to: ${downloadPath}`);
    
    return downloadPath
  }

  async getMetadata(transferCode: string): Promise<FileMetadata | null> {
    console.log(`[Metadata] Fetching metadata for transfer code: ${transferCode}`);
    
    try {
      const packageDir = path.join(this.tempDir, 'coordinator');
      await fs.promises.mkdir(packageDir, { recursive: true });
      await this.createNpmrc(packageDir);

      const version = `0.0.0-alpha.${transferCode}`;
      const command = `npm view ${this.basePackageName}@${version} customData --json`;
      
      console.log(`[Metadata] Executing: ${command}`);
      const result = await execAsync(command, {
        cwd: packageDir,
        env: { ...process.env, npm_config_registry: this.registry }
      });

      if (!result.stdout.trim()) {
        console.log('[Metadata] No data returned from npm');
        return null;
      }

      const data = JSON.parse(result.stdout);
      console.log('[Metadata] Successfully retrieved metadata');
      return data?.metadata || null;
    } catch (error) {
      console.error('[Metadata] Failed to get metadata:', error);
      return null;
    }
  }

  private async downloadChunks(code: string, metadata: FileMetadata, downloadPath: string) {
    console.log(`[Download] Starting to download ${metadata.totalChunks} chunks, ${code}, ${JSON.stringify(metadata)}`);
    
    try {
      // 1. 获取主包信息以获取 chunks 列表
      const packageDir = path.join(this.tempDir, 'coordinator');
      await fs.promises.mkdir(packageDir, { recursive: true });
      await this.createNpmrc(packageDir);

      const mainVersion = `0.0.0-alpha.${code}`;
      const viewCommand = `npm view ${this.basePackageName}@${mainVersion} customData --json`;
      const { stdout: mainStdout } = await execAsync(viewCommand, {
        cwd: packageDir,
        env: { ...process.env, npm_config_registry: this.registry }
      });

      const mainData = JSON.parse(mainStdout);
      const { chunks } = mainData;

      if (!chunks || !Array.isArray(chunks)) {
        throw new Error('Invalid chunks data in package metadata');
      }

      console.log(`[Chunks] Found ${chunks.length} chunks in metadata`);

      // 2. 下载所有分片
      const chunkBuffers: Buffer[] = [];
      for (const chunk of chunks) {
        console.log(`[Chunks] Downloading chunk ${chunk.index}/${metadata.totalChunks - 1}`);
        
        // 获取分片包
        const command = `npm pack ${this.basePackageName}-sub@${chunk.version}`;
        const { stdout } = await execAsync(command, {
          cwd: packageDir,
          env: { ...process.env, npm_config_registry: this.registry }
        });

        const tarballPath = path.join(packageDir, stdout.trim());
        
        // 创建解压目录
        const extractDir = path.join(packageDir, `chunk-${chunk.index}`);
        await fs.promises.mkdir(extractDir, { recursive: true });

        // 解压 tarball
        await execAsync(`tar -xf ${tarballPath} -C ${extractDir}`);

        // 读取分片数据
        const chunkData = await fs.promises.readFile(
          path.join(extractDir, 'package', 'chunk.bin')
        );
        chunkBuffers.push(chunkData);
      }

      // 3. 合并分片并写入文件
      console.log('[Chunks] Merging chunks...');
      const finalBuffer = Buffer.concat(chunkBuffers);
      const outputPath = path.join(downloadPath, metadata.name);
      await fs.promises.writeFile(outputPath, finalBuffer);

      console.log('[Chunks] All chunks downloaded and merged successfully');
    } catch (error) {
      console.error('[Chunks] Failed to download chunks:', error);
      throw error;
    } finally {
      await this.cleanup();
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
      console.log('[Cleanup] Temporary files removed');
    } catch (error) {
      console.error('[Cleanup] Failed to cleanup:', error);
    }
  }
} 