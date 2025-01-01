import { CronJob } from 'cron';
import { NpmDownloader } from '../lib/npm/downloader';
import path from 'path';
import fs from 'fs';

interface DownloadTask {
  transferCode: string;
  retries: number;
  lastAttempt: Date;
}

export class SyncService {
  private cronJob: CronJob;
  private downloader: NpmDownloader;
  private readonly downloadDir: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 5 * 60 * 1000; // 5分钟
  private readonly pendingTasks: Map<string, DownloadTask>;

  constructor(
    downloader: NpmDownloader, 
    schedule: string,
    downloadDir: string
  ) {
    this.downloader = downloader;
    this.downloadDir = downloadDir;
    this.pendingTasks = new Map();
    this.cronJob = new CronJob(schedule, this.sync.bind(this));
  }

  start(): void {
    this.cronJob.start();
  }

  stop(): void {
    this.cronJob.stop();
  }

  async addTask(transferCode: string): Promise<void> {
    // 添加新的下载任务
    this.pendingTasks.set(transferCode, {
      transferCode,
      retries: 0,
      lastAttempt: new Date(0) // 从未尝试过
    });

    // 立即尝试同步
    await this.sync();
  }

  private async sync(): Promise<void> {
    for (const [transferCode, task] of this.pendingTasks.entries()) {
      // 跳过最近尝试过的任务
      if (Date.now() - task.lastAttempt.getTime() < this.retryDelay) {
        continue;
      }

      try {
        // 1. 获取元数据
        const metadata = await this.downloader.getMetadata(transferCode);
        if (!metadata) {
          if (task.retries >= this.maxRetries) {
            console.error(`任务 ${transferCode} 超过最大重试次数`);
            this.pendingTasks.delete(transferCode);
          } else {
            // 更新重试信息
            this.pendingTasks.set(transferCode, {
              ...task,
              retries: task.retries + 1,
              lastAttempt: new Date()
            });
          }
          continue;
        }

        // 2. 创建目标目录
        const targetDir = path.join(
          this.downloadDir,
          transferCode,
          metadata.name
        );

        // 3. 下载文件
        await this.downloader.downloadFile(
          transferCode,
          path.join(targetDir, metadata.name)
        );

        // 4. 写入元数据
        await fs.promises.writeFile(
          path.join(targetDir, 'metadata.json'),
          JSON.stringify(metadata, null, 2)
        );

        // 5. 任务完成，从队列中移除
        this.pendingTasks.delete(transferCode);

        console.log(`文件 ${metadata.name} (${transferCode}) 下载完成`);
      } catch (error) {
        console.error(`同步任务 ${transferCode} 失败:`, error);
        
        // 更新重试信息
        if (task.retries >= this.maxRetries) {
          this.pendingTasks.delete(transferCode);
        } else {
          this.pendingTasks.set(transferCode, {
            ...task,
            retries: task.retries + 1,
            lastAttempt: new Date()
          });
        }
      }
    }
  }
} 