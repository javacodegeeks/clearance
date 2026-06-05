// Hook for auto-generating missions on PR queue load

import { useEffect, useMemo, useRef } from 'react';
import { missionGeneratorWorker, type GenerationJob } from '@/lib/features/missions/mission-generator-worker';
import { getProactiveSettings } from '@/lib/config/proactive-settings';
import { PullRequest } from '@/lib/types/github';
import { getMissions } from '@/lib/storage/indexeddb-storage';
import { getCredentials } from '@/lib/storage/credentials-storage';

interface UseAutoGenerationOptions {
  prs: PullRequest[];
  enabled?: boolean;
  onNotification?: (notification: {
    type: 'success' | 'error' | 'activity';
    prNumber: number;
    repository: string;
    title: string;
    message?: string;
    details?: string;
    actions?: Array<{ label: string; onClick?: () => void; href?: string }>;
  }) => void;
}

export function useAutoGeneration({ prs, enabled = true, onNotification }: UseAutoGenerationOptions) {
  // Track if we've already shown the not-configured notification
  const notificationShownRef = useRef(false);

  // Enable persistence on mount
  useEffect(() => {
    missionGeneratorWorker.enablePersistence();
  }, []);

  // Create stable identifier for PR list to prevent unnecessary re-renders
  const prIds = useMemo(() =>
    prs.map(pr => `${pr.repository}:${pr.number}`).join(','),
    [prs]
  );

  useEffect(() => {
    if (!enabled || prs.length === 0) {
      return;
    }

    async function autoGenerateMissions() {
      const settings = getProactiveSettings();

      if (!settings.autoGeneration.enabled) {
        return;
      }

      // Check Azure OpenAI credentials before attempting generation
      const creds = getCredentials();
      const hasAzureCredentials = !!(
        creds?.azure_openai_endpoint &&
        creds?.azure_openai_key &&
        creds?.azure_openai_deployment &&
        creds?.azure_openai_api_version
      );

      if (!hasAzureCredentials) {
        // Show notification only once per session
        if (!notificationShownRef.current && onNotification) {
          onNotification({
            type: 'activity',
            prNumber: 0,
            repository: 'system',
            title: 'Proactive analysis disabled',
            message: 'Configure Azure OpenAI in settings to enable automatic mission generation',
            actions: [{ label: 'Configure Settings', href: '/settings' }]
          });
          notificationShownRef.current = true;
        }
        console.log('[AutoGeneration] Azure OpenAI not configured, skipping proactive analysis');
        return;
      }

      for (const pr of prs) {
        // Skip merged PRs - no need to generate missions
        if (pr.review_status === 'merged') {
          continue;
        }

        const riskScore = pr.risk_score ?? 5.0; // Default to medium risk if not calculated

        try {
          const existingMissions = await getMissions(pr.number, pr.repository);

          if (existingMissions) {
            console.log(`[AutoGeneration] PR #${pr.number} already has missions, skipping`);
            continue;
          }

          const [owner, repo] = pr.repository.split('/');

          const job: GenerationJob = {
            prNumber: pr.number,
            repository: pr.repository,
            owner,
            priority: riskScore,
            reason: riskScore >= 8 ? 'high_risk' : 'large_change',
            timestamp: Date.now(),
            prTitle: pr.title,
            prBody: '', // PR body not available in list view, will be fetched by worker
            changedFiles: pr.changed_files,
            additions: pr.additions,
            deletions: pr.deletions,
            files: [], // Will be fetched by the worker
            pr_updated_at: pr.updated_at
          };

          console.log(`[AutoGeneration] Enqueueing PR #${pr.number} (risk: ${riskScore.toFixed(1)}, files: ${pr.changed_files})`);

          // Note: Worker will fetch file details via GitHub API when processing
          await missionGeneratorWorker.enqueue(job);
        } catch (error) {
          console.error(`[AutoGeneration] Error enqueueing PR #${pr.number}:`, error);
        }
      }
    }

    autoGenerateMissions();
  }, [prIds, enabled]); // Use prIds instead of prs to prevent unnecessary re-renders

  useEffect(() => {
    if (onNotification) {
      missionGeneratorWorker.setNotificationCallback(onNotification);
    }
  }, [onNotification]);
}

export function getAutoGenerationStatus() {
  return missionGeneratorWorker.getQueueStatus();
}

export function isGeneratingForPR(prNumber: number, repository: string): boolean {
  return missionGeneratorWorker.isProcessing(prNumber, repository);
}
