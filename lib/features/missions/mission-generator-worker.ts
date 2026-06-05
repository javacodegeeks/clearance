// Background worker for proactive mission generation
// Manages priority queue, concurrency control, and deduplication

import { saveMissions, getMissions } from '@/lib/storage/indexeddb-storage';
import { getCredentials } from '@/lib/storage/credentials-storage';
import { apiPost } from '@/lib/utils/api-client';

export interface GenerationJob {
  prNumber: number;
  repository: string;
  owner: string;
  priority: number;
  reason: 'high_risk' | 'large_change' | 'manual_request';
  timestamp: number;
  prTitle: string;
  prBody: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  files: Array<{ filename: string; patch: string }>;
  pr_updated_at: string;
}

interface QueueItem {
  job: GenerationJob;
  priority: number;
}

type NotificationCallback = (notification: {
  type: 'success' | 'error' | 'activity';
  prNumber: number;
  repository: string;
  title: string;
  message?: string;
  details?: string;
  actions?: Array<{ label: string; onClick?: () => void; href?: string }>;
}) => void;

class PriorityQueue {
  private items: QueueItem[] = [];

  enqueue(job: GenerationJob, priority: number): void {
    const item = { job, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): GenerationJob | null {
    const item = this.items.shift();
    return item ? item.job : null;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  peek(): GenerationJob | null {
    return this.items[0]?.job || null;
  }

  remove(prNumber: number, repository: string): boolean {
    const index = this.items.findIndex(
      item => item.job.prNumber === prNumber && item.job.repository === repository
    );

    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }

    return false;
  }

  getItems(): QueueItem[] {
    return this.items;
  }

  setItems(items: QueueItem[]): void {
    this.items = items;
  }
}

class MissionGeneratorWorker {
  private queue: PriorityQueue = new PriorityQueue();
  private processing: Map<string, { job: GenerationJob; startTime: number }> = new Map();
  private readonly MAX_CONCURRENT = 2;
  private notificationCallback: NotificationCallback | null = null;
  private readonly STORAGE_KEY = 'mission_queue_state';
  private persistenceEnabled: boolean = false;

  constructor() {
    // Restore queue state from localStorage on initialization
    this.restoreQueue();
  }

  setNotificationCallback(callback: NotificationCallback): void {
    this.notificationCallback = callback;
  }

  private persistQueue(): void {
    if (!this.persistenceEnabled || typeof window === 'undefined') {
      return;
    }

    try {
      const state = {
        queue: this.queue.getItems(),
        processing: Array.from(this.processing.entries()).map(([key, value]) => ({
          key,
          job: value.job,
          startTime: value.startTime
        })),
        timestamp: Date.now()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[MissionGenerator] Failed to persist queue:', error);
    }
  }

  private restoreQueue(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return;
      }

      const state = JSON.parse(stored);

      // Don't restore state older than 1 hour
      if (Date.now() - state.timestamp > 3600000) {
        console.log('[MissionGenerator] Clearing stale persisted state');
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // Restore queue items
      if (state.queue && Array.isArray(state.queue)) {
        state.queue.forEach((item: QueueItem) => {
          this.queue.enqueue(item.job, item.priority);
        });
        console.log(`[MissionGenerator] Restored ${state.queue.length} queued jobs`);
      }

      // Restore processing jobs - re-enqueue them since they were interrupted
      if (state.processing && Array.isArray(state.processing)) {
        state.processing.forEach((entry: { key: string; job: GenerationJob; startTime: number }) => {
          // Re-enqueue interrupted jobs at front of queue
          this.queue.enqueue(entry.job, entry.job.priority + 1); // +1 to prioritize
        });
        console.log(`[MissionGenerator] Re-enqueued ${state.processing.length} interrupted jobs`);
      }

      // Enable persistence after successful restore
      this.persistenceEnabled = true;

      // Start processing if there are jobs
      if (this.queue.size() > 0) {
        console.log('[MissionGenerator] Auto-starting queue processing after restore');
        this.processQueue();
      }
    } catch (error) {
      console.error('[MissionGenerator] Failed to restore queue:', error);
      // Clear corrupted state
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  enablePersistence(): void {
    this.persistenceEnabled = true;
  }

  disablePersistence(): void {
    this.persistenceEnabled = false;
  }

  private notify(notification: Parameters<NotificationCallback>[0]): void {
    if (this.notificationCallback) {
      this.notificationCallback(notification);
    }
  }

  private getJobKey(prNumber: number, repository: string): string {
    return `${repository}:${prNumber}`;
  }

  async enqueue(job: GenerationJob): Promise<void> {
    const key = this.getJobKey(job.prNumber, job.repository);

    if (this.processing.has(key)) {
      console.log(`[MissionGenerator] PR #${job.prNumber} already generating, skipping`);
      return;
    }

    const existingMissions = await getMissions(job.prNumber, job.repository);
    if (existingMissions && (Date.now() - existingMissions.generated_at < 3600000)) {
      console.log(`[MissionGenerator] PR #${job.prNumber} has recent missions (< 1 hour old), skipping`);
      return;
    }

    console.log(`[MissionGenerator] Enqueueing PR #${job.prNumber} with priority ${job.priority.toFixed(1)}`);
    this.queue.enqueue(job, job.priority);

    // Persist queue state
    this.persistQueue();

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.queue.size() > 0 && this.processing.size < this.MAX_CONCURRENT) {
      const job = this.queue.dequeue();
      if (!job) break;

      const key = this.getJobKey(job.prNumber, job.repository);
      this.processing.set(key, { job, startTime: Date.now() });

      // Persist state after dequeuing and adding to processing
      this.persistQueue();

      console.log(`[MissionGenerator] Starting generation for PR #${job.prNumber} (${this.processing.size}/${this.MAX_CONCURRENT} active)`);

      this.notify({
        type: 'activity',
        prNumber: job.prNumber,
        repository: job.repository,
        title: `Analyzing PR #${job.prNumber} (${job.reason.replace('_', ' ')})`,
        message: 'Starting analysis...'
      });

      this.generateMissions(job)
        .finally(() => {
          this.processing.delete(key);
          // Persist state after job completion
          this.persistQueue();
          this.processQueue();
        });
    }
  }

  private async generateMissions(job: GenerationJob): Promise<void> {
    const startTime = Date.now();
    const key = this.getJobKey(job.prNumber, job.repository);

    try {
      const credentials = getCredentials();
      if (!credentials) {
        throw new Error('Credentials not configured');
      }

      const [owner, repo] = job.repository.split('/');

      console.log(`[MissionGenerator] Calling API for PR #${job.prNumber}`);
      const response = await apiPost<{
        missions: any[];
        generated_at: string;
        files_analyzed: number;
        pr_updated_at: string;
      }>(
        '/api/v1/version-control/pr/missions',
        {
          owner,
          repo,
          pr_number: job.prNumber
        },
        credentials
      );

      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(1);

      console.log(`[MissionGenerator] Generated ${response.missions.length} missions for PR #${job.prNumber} in ${durationSeconds}s`);

      await saveMissions(job.prNumber, job.repository, response.missions, response.pr_updated_at);

      this.notify({
        type: 'success',
        prNumber: job.prNumber,
        repository: job.repository,
        title: `Analyzing PR #${job.prNumber} (${job.reason.replace('_', ' ')})`,
        message: `Generated ${response.missions.length} missions in ${durationSeconds}s`,
        actions: [
          { label: 'View PR', href: `/pr/${job.owner}/${job.repository.split('/')[1]}/${job.prNumber}` }
        ]
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[MissionGenerator] Failed to generate missions for PR #${job.prNumber}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.notify({
        type: 'error',
        prNumber: job.prNumber,
        repository: job.repository,
        title: `Failed to analyze PR #${job.prNumber}`,
        message: errorMessage,
        actions: [
          {
            label: 'Retry',
            onClick: () => {
              this.enqueue(job);
            }
          }
        ]
      });

      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        console.log(`[MissionGenerator] Network error, will retry once after 5 seconds`);
        setTimeout(() => {
          this.enqueue(job);
        }, 5000);
      }
    }
  }

  cancelJob(prNumber: number, repository: string): boolean {
    const key = this.getJobKey(prNumber, repository);

    if (this.processing.has(key)) {
      console.warn(`[MissionGenerator] Cannot cancel PR #${prNumber} - already processing`);
      return false;
    }

    const removed = this.queue.remove(prNumber, repository);
    if (removed) {
      console.log(`[MissionGenerator] Cancelled queued job for PR #${prNumber}`);
      // Persist state after removing from queue
      this.persistQueue();
    }

    return removed;
  }

  getQueueStatus(): {
    queued: number;
    processing: number;
    processingJobs: Array<{ prNumber: number; repository: string; startTime: number }>;
  } {
    return {
      queued: this.queue.size(),
      processing: this.processing.size,
      processingJobs: Array.from(this.processing.values()).map(({ job, startTime }) => ({
        prNumber: job.prNumber,
        repository: job.repository,
        startTime
      }))
    };
  }

  isProcessing(prNumber: number, repository: string): boolean {
    const key = this.getJobKey(prNumber, repository);
    return this.processing.has(key);
  }

  clearQueue(): void {
    console.log(`[MissionGenerator] Clearing queue (${this.queue.size()} jobs)`);
    this.queue.clear();
    // Persist cleared state
    this.persistQueue();
  }
}

export const missionGeneratorWorker = new MissionGeneratorWorker();
