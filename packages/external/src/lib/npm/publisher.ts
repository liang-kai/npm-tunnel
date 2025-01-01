import { FileChunk, FileMetadata } from '@file-transfer/shared';
import { PackageGenerator } from './package-generator';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class NpmPublisher {
  private readonly registry: string;
  private readonly authToken: string;
  private readonly packageGenerator: PackageGenerator;
  private readonly tempDir: string;

  constructor(registry: string, authToken: string) {
    this.registry = registry;
    this.authToken = authToken;
    this.packageGenerator = new PackageGenerator();
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async publishFile(chunks: FileChunk[], metadata: FileMetadata): Promise<void> {
    try {
      // 1. 发布协调包
      const coordPackage = this.packageGenerator.generateCoordinatorPackage(metadata);
      await this.publishCoordinatorPackage(coordPackage);

      // 2. 发布每个分片
      for (const chunk of chunks) {
        const chunkPackage = this.packageGenerator.generateChunkPackage(
          { index: chunk.index, hash: chunk.hash },
          metadata
        );
        await this.publishChunkPackage(chunk, chunkPackage);
      }
    } finally {
      // 清理临时文件
      await this.cleanup();
    }
  }

  private async publishCoordinatorPackage(packageInfo: any): Promise<void> {
    const packageDir = path.join(this.tempDir, packageInfo.name);
    await this.createTempDir(packageDir);

    // 创建 package.json，移除 private 字段
    await fs.promises.writeFile(
      path.join(packageDir, 'package.json'),
      JSON.stringify({
        name: packageInfo.name,
        version: packageInfo.version,
        files: packageInfo.files,
        publishConfig: {
          registry: "https://registry.npmjs.org/",
          access: "public"
        }
      }, null, 2)
    );

    // 创建 index.json
    await fs.promises.writeFile(
      path.join(packageDir, 'index.json'),
      JSON.stringify(packageInfo.content, null, 2)
    );

    // 发布包
    await this.publishPackage(packageDir);
  }

  private async publishChunkPackage(chunk: FileChunk, packageInfo: any): Promise<void> {
    const packageDir = path.join(this.tempDir, packageInfo.name);
    await this.createTempDir(packageDir);

    // 创建 package.json
    await fs.promises.writeFile(
      path.join(packageDir, 'package.json'),
      JSON.stringify({
        name: packageInfo.name,
        version: packageInfo.version,
        files: packageInfo.files,
        publishConfig: {
          registry: "https://registry.npmjs.org/",
          access: "public"
        }
      }, null, 2)
    );

    // 写入分片数据 - 修改这里的处理方式
    const chunkData = chunk.data instanceof Buffer 
      ? chunk.data 
      : Buffer.from(chunk.data as any);
    
    await fs.promises.writeFile(
      path.join(packageDir, 'chunk.bin'),
      chunkData
    );

    // 发布包
    await this.publishPackage(packageDir);
  }

  private async createTempDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  private async publishPackage(packageDir: string, retries = 3): Promise<void> {
    const npmrcPath = path.join(packageDir, '.npmrc');
    
    // 修改 .npmrc 配置，保留代理设置
    const npmrcContent = [
      'registry=https://registry.npmjs.org/',
      `//registry.npmjs.org/:_authToken=${this.authToken}`,
      'always-auth=true',
      'strict-ssl=true',
      // 保留代理配置
      'proxy=http://127.0.0.1:14249/',
      'https-proxy=http://127.0.0.1:14249/',
      // 网络重试配置
      'fetch-retries=5',
      'fetch-retry-mintimeout=20000',
      'fetch-retry-maxtimeout=120000'
    ].join('\n');

    try {
      await fs.promises.writeFile(npmrcPath, npmrcContent);

      try {
        await execAsync('npm publish --access public', {
          cwd: packageDir,
          env: { 
            ...process.env, 
            NPM_TOKEN: this.authToken,
            npm_config_registry: 'https://registry.npmjs.org/',
            // 设置代理环境变量
            npm_config_proxy: 'http://127.0.0.1:14249/',
            npm_config_https_proxy: 'http://127.0.0.1:14249/'
          }
        });
      } catch (error) {
        if (retries > 0 && error.message.includes('ECONNRESET')) {
          console.log(`发布失败，重试剩余次数: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return this.publishPackage(packageDir, retries - 1);
        }
        throw error;
      }
    } finally {
      await fs.promises.unlink(npmrcPath).catch(() => {});
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.promises.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
} 