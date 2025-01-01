import { FileMetadata } from '@file-transfer/shared';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PackageGenerator } from './package-generator';
import { sleep } from '@/lib/utils';

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

  async publishFile(metadata: FileMetadata, chunks: { index: number; data: Buffer; hash: string }[]): Promise<void> {
    console.log(`[Upload] Starting upload for ${metadata.name} (${chunks.length} chunks)`);

    try {
      await fs.promises.mkdir(this.tempDir, { recursive: true });
      
      // 1. 先发布主包
      await this.publishCoordinatorPackage(metadata);
      // 等待主包处理完成
      await sleep(3000);

      // 2. 串行发布分片包
      for (const chunk of chunks) {
        await this.publishChunkPackage(chunk, metadata);
        // 每个分片之间添加延迟
        await sleep(3000);
      }

      console.log(`[Upload] Successfully uploaded ${metadata.name}`);
    } catch (error) {
      console.error(`[Upload] Failed to upload ${metadata.name}:`, error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async publishCoordinatorPackage(metadata: FileMetadata): Promise<void> {
    try {
      const packageInfo = this.packageGenerator.generateCoordinatorPackage(metadata);
      const packageDir = path.join(this.tempDir, 'coordinator');
      
      console.log(`[Upload] Publishing coordinator package for ${metadata.transferCode}`);
      
      await fs.promises.mkdir(packageDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(packageDir, 'package.json'),
        JSON.stringify(packageInfo, null, 2)
      );
      await fs.promises.writeFile(
        path.join(packageDir, 'index.json'),
        JSON.stringify(packageInfo.customData, null, 2)
      );
      await this.createNpmrc(packageDir);
      await this.publishPackage(packageDir);
    } catch (error) {
      console.error(`[Upload] Failed to publish coordinator package:`, error);
      throw error;
    }
  }

  private async publishChunkPackage(
    chunk: { index: number; data: Buffer; hash: string }, 
    metadata: FileMetadata
  ): Promise<void> {
    try {
      const packageInfo = this.packageGenerator.generateChunkPackage(chunk, metadata);
      const packageDir = path.join(this.tempDir, `chunk-${chunk.index}`);

      console.log(`[Upload] Publishing chunk ${chunk.index + 1}/${metadata.totalChunks}`);

      await fs.promises.mkdir(packageDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(packageDir, 'package.json'),
        JSON.stringify(packageInfo, null, 2)
      );
      await fs.promises.writeFile(
        path.join(packageDir, 'chunk.bin'),
        chunk.data
      );
      await this.createNpmrc(packageDir);
      await this.publishPackage(packageDir);
    } catch (error) {
      console.error(`[Upload] Failed to publish chunk ${chunk.index}:`, error);
      throw error;
    }
  }

  private async createNpmrc(dir: string): Promise<void> {
    const npmrcPath = path.join(dir, '.npmrc');
    const npmrcContent = [
      `//registry.npmjs.org/:_authToken=${this.authToken}`,
      `registry=${this.registry}`,
      'always-auth=true'
    ].join('\n');

    await fs.promises.writeFile(npmrcPath, npmrcContent);
    console.log('[Npmrc] Created with content:', npmrcContent);
  }

  private async waitForPackageAvailable(packageName: string, version: string, maxAttempts = 10): Promise<boolean> {
    console.log(`[Publish] Waiting for package ${packageName}@${version} to be available...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { stdout } = await execAsync(
          `npm view ${packageName}@${version} version --json`,
          {
            env: { ...process.env, npm_config_registry: this.registry }
          }
        );
        
        if (stdout.trim()) {
          console.log(`[Publish] Package ${packageName}@${version} is now available`);
          return true;
        }
      } catch (error) {
        // 包还不可用，继续等待
      }
      
      await sleep(1000); // 每秒检查一次
    }
    
    console.warn(`[Publish] Timeout waiting for ${packageName}@${version}`);
    return false;
  }

  private async publishPackage(packageDir: string, retries = 3, delay = 2000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[Publish] Attempting to publish package (attempt ${i + 1}/${retries})`);
        
        // 读取 package.json 以获取包名和版本
        const pkgJson = JSON.parse(
          await fs.promises.readFile(path.join(packageDir, 'package.json'), 'utf-8')
        );
        
        await execAsync('npm publish --access public', {
          cwd: packageDir,
          env: { 
            ...process.env, 
            npm_config_registry: this.registry,
            npm_config_userconfig: path.join(packageDir, '.npmrc')
          }
        });

        // 等待包可用
        const isAvailable = await this.waitForPackageAvailable(pkgJson.name, pkgJson.version);
        if (!isAvailable) {
          throw new Error('Package not available after publishing');
        }
        
        return;
      } catch (error) {
        console.error('[Publish] Error:', error);
        if (i === retries - 1) throw error;
        
        console.log(`[Publish] Failed attempt ${i + 1}, retrying...`);
        await sleep(delay);
        delay *= 2;
      }
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.promises.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[Upload] Failed to cleanup temp directory:', error);
    }
  }
} 