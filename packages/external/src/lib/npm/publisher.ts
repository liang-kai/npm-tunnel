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
      await this.publishCoordinatorPackage(metadata);
      await Promise.all(chunks.map(chunk => this.publishChunkPackage(chunk, metadata)));
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
      `registry=${this.registry}`,
      `${this.registry.replace('http:', '')}/:_authToken=${this.authToken}`,
      'always-auth=true'
    ].join('\n');

    await fs.promises.writeFile(npmrcPath, npmrcContent);
  }

  private async publishPackage(packageDir: string, retries = 3, delay = 2000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[Publish] Attempting to publish package (attempt ${i + 1}/${retries})`);
        await execAsync('npm publish', {
          cwd: packageDir,
          env: { ...process.env, npm_config_registry: this.registry }
        });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        
        console.log(`[Publish] Failed attempt ${i + 1}, waiting ${delay}ms before retry`);
        await sleep(delay);
        // 增加延迟时间，避免频繁冲突
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