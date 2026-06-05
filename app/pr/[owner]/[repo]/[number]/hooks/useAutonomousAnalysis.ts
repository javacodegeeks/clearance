/**
 * Autonomous Analysis Hook
 * Orchestrates parallel execution of risk, missions, and code governance analysis
 * with detailed execution tracing for observability
 */

import { ORCHESTRATOR_RULES } from '@/lib/constants/ai-prompts-and-tools';
import { EnhancedRiskBreakdown } from '@/lib/features/risk-assessment/risk-calculator-enhanced';
import type { AgentAnalysis } from '@/lib/services/code-governance/types';
import { getCredentials } from '@/lib/storage/credentials-storage';
import { getMissions } from '@/lib/storage/indexeddb-storage';
import { Mission, PullRequest } from '@/lib/types/github';
import { apiGet, apiPost } from '@/lib/utils/api-client';
import { useCallback, useEffect, useState } from 'react';
import type {
  AnalysisStatus,
  AnalysisTask,
  DecisionPoint,
  OrchestratorState,
  ToolInvocation,
  UseAutonomousAnalysisResult
} from './types';

interface PRCharacteristics {
  highChangeCount: boolean;
  hasSecurityFiles: boolean;
  hasNewFiles: boolean;
  hasTestFiles: boolean;
  lineCount: number;
}

/**
 * Analyzes PR characteristics to determine analysis priority
 */
function analyzePRCharacteristics(pr: PullRequest, files: any[]): PRCharacteristics {
  const lineCount = (pr.additions || 0) + (pr.deletions || 0);

  return {
    highChangeCount: lineCount > ORCHESTRATOR_RULES.HIGH_CHANGE_THRESHOLD,
    hasSecurityFiles: files.some(f =>
      ORCHESTRATOR_RULES.SECURITY_FILE_PATTERNS.some(pattern => f.filename.includes(pattern))
    ),
    hasNewFiles: files.some(f => f.status === 'added'),
    hasTestFiles: files.some(f =>
      ORCHESTRATOR_RULES.TEST_FILE_PATTERNS.some(pattern => f.filename.includes(pattern))
    ),
    lineCount,
  };
}

/**
 * Determines priority order based on PR characteristics
 */
function decidePriority(characteristics: PRCharacteristics): AnalysisTask[] {
  // Security files → governance first
  if (characteristics.hasSecurityFiles) {
    return ['governance', 'risk', 'missions'];
  }

  // High change count → risk first
  if (characteristics.highChangeCount) {
    return ['risk', 'missions', 'governance'];
  }

  // New files → missions first (need guidance on what to review)
  if (characteristics.hasNewFiles) {
    return ['missions', 'risk', 'governance'];
  }

  // Default: balanced approach
  return ['risk', 'missions', 'governance'];
}

/**
 * Generates reasoning text for priority decision
 */
function generateReasoning(characteristics: PRCharacteristics, priority: AnalysisTask[]): string {
  const { lineCount, hasSecurityFiles, hasNewFiles, highChangeCount } = characteristics;

  if (hasSecurityFiles) {
    return ORCHESTRATOR_RULES.REASONING_TEMPLATES.SECURITY();
  }

  if (highChangeCount) {
    return ORCHESTRATOR_RULES.REASONING_TEMPLATES.HIGH_CHANGES(lineCount);
  }

  if (hasNewFiles) {
    return ORCHESTRATOR_RULES.REASONING_TEMPLATES.NEW_FILES();
  }

  return ORCHESTRATOR_RULES.REASONING_TEMPLATES.BALANCED();
}

export function useAutonomousAnalysis(
  pr: PullRequest | null,
  files: any[] | undefined,
  autoStart: boolean = true
): UseAutonomousAnalysisResult {
  const [orchestrator, setOrchestrator] = useState<OrchestratorState>({
    active: false,
    reasoning: '',
    tasks: [],
    startTime: 0,
    trace: {
      tools: [],
      decisions: [],
      timeline: {
        start: 0,
        events: [],
      },
    },
  });

  const [enhancedRisk, setEnhancedRisk] = useState<EnhancedRiskBreakdown | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [codeGovernanceAnalysis, setCodeGovernanceAnalysis] = useState<AgentAnalysis | null | undefined>(undefined);

  /**
   * Record a tool invocation in the trace
   */
  const recordToolStart = useCallback((task: AnalysisTask, name: string, input: Record<string, any>, endpoint: string) => {
    const toolInvocation: ToolInvocation = {
      id: `${task}-${Date.now()}`,
      task,
      name,
      startTime: Date.now(),
      status: 'running',
      input,
      endpoint,
    };

    setOrchestrator(prev => ({
      ...prev,
      trace: {
        ...prev.trace,
        tools: [...prev.trace.tools, toolInvocation],
        timeline: {
          ...prev.trace.timeline,
          events: [
            ...prev.trace.timeline.events,
            {
              timestamp: Date.now(),
              type: 'tool_start',
              taskId: toolInvocation.id,
              message: `Started ${name}`,
            },
          ],
        },
      },
    }));

    return toolInvocation.id;
  }, []);

  /**
   * Record tool completion
   */
  const recordToolEnd = useCallback((toolId: string, output: any, error?: string) => {
    const endTime = Date.now();

    setOrchestrator(prev => {
      const tool = prev.trace.tools.find(t => t.id === toolId);
      if (!tool) return prev;

      const duration = (endTime - tool.startTime) / 1000;

      return {
        ...prev,
        trace: {
          ...prev.trace,
          tools: prev.trace.tools.map(t =>
            t.id === toolId
              ? {
                ...t,
                endTime,
                duration,
                status: error ? 'error' : 'complete',
                output,
                error,
              }
              : t
          ),
          timeline: {
            ...prev.trace.timeline,
            events: [
              ...prev.trace.timeline.events,
              {
                timestamp: endTime,
                type: 'tool_end',
                taskId: toolId,
                message: error ? `Failed ${tool.name}: ${error}` : `Completed ${tool.name} (${duration.toFixed(1)}s)`,
              },
            ],
          },
        },
      };
    });
  }, []);

  /**
   * Record a decision point
   */
  const recordDecision = useCallback((type: DecisionPoint['type'], decision: string, reasoning: string, alternatives?: string[]) => {
    const decisionPoint: DecisionPoint = {
      id: `decision-${Date.now()}`,
      timestamp: Date.now(),
      type,
      decision,
      reasoning,
      alternatives,
    };

    setOrchestrator(prev => ({
      ...prev,
      trace: {
        ...prev.trace,
        decisions: [...prev.trace.decisions, decisionPoint],
        timeline: {
          ...prev.trace.timeline,
          events: [
            ...prev.trace.timeline.events,
            {
              timestamp: Date.now(),
              type: 'decision',
              taskId: decisionPoint.id,
              message: `Decision: ${decision}`,
            },
          ],
        },
      },
    }));
  }, []);

  /**
   * Fetch risk assessment
   */
  const fetchRiskAssessment = async (pr: PullRequest): Promise<void> => {
    try {
      const creds = getCredentials();
      if (!creds?.github_token) {
        throw new Error('GitHub credentials not configured');
      }

      const [owner, repo] = pr.repository.split('/');
      const response = await apiGet<EnhancedRiskBreakdown>(
        `/api/v1/version-control/pr/risk?owner=${owner}&repo=${repo}&pr_number=${pr.number}`,
        creds
      );

      setEnhancedRisk(response);
      return Promise.resolve();
    } catch (error) {
      throw error;
    }
  };

  /**
   * Fetch review missions (checks cache first)
   */
  const fetchReviewMissions = async (pr: PullRequest): Promise<void> => {
    const [owner, repo] = pr.repository.split('/');

    // Check if missions already exist in cache
    console.log('[fetchReviewMissions] Checking cache for PR', pr.number);
    const cachedMissions = await getMissions(pr.number, pr.repository);

    if (cachedMissions && cachedMissions.missions.length > 0) {
      console.log('[fetchReviewMissions] Using cached missions:', cachedMissions.missions.length);
      setMissions(cachedMissions.missions);
      return;
    }

    // No cache - fetch from API
    console.log('[fetchReviewMissions] No cache found, fetching from API');
    const creds = getCredentials();
    if (!creds) {
      throw new Error('Credentials not found');
    }

    // Check Azure OpenAI credentials BEFORE making API call
    if (!creds.azure_openai_endpoint || !creds.azure_openai_key ||
      !creds.azure_openai_deployment || !creds.azure_openai_api_version) {
      throw new Error('Azure OpenAI not configured');
    }

    const data = await apiPost<any>('/api/v1/version-control/pr/missions', {
      owner,
      repo,
      pr_number: pr.number,
    }, creds);

    const generatedMissions = data.missions.map((m: any, idx: number) => ({
      ...m,
      id: `mission-${Date.now()}-${idx}`,
      status: 'pending' as const,
    }));

    setMissions(generatedMissions);
  };

  /**
   * Fetch code governance analysis
   */
  const fetchCodeGovernance = async (pr: PullRequest): Promise<void> => {
    try {
      const credentials = getCredentials();
      if (!credentials) {
        console.log('[CodeGovernance] No credentials found');
        setCodeGovernanceAnalysis(null);
        return;
      }

      const { github_token, sonarqube_url, sonarqube_token } = credentials;

      if (!github_token) {
        console.log('[CodeGovernance] GitHub token missing');
        setCodeGovernanceAnalysis(null);
        return;
      }

      if (!sonarqube_url || !sonarqube_token) {
        // SonarQube not configured - expected state
        console.log('[CodeGovernance] SonarQube credentials not configured');
        setCodeGovernanceAnalysis(null);
        return;
      }

      console.log('[CodeGovernance] Fetching analysis for PR', pr.number);

      const [owner, repo] = pr.repository.split('/');
      const branch = pr.head?.ref || 'main';

      // Fetch SonarQube config
      console.log('[CodeGovernance] Fetching SonarQube config...');
      const configResponse = await fetch(
        `/api/v1/code-analysis/config?owner=${owner}&repo=${repo}&branch=dev`,
        {
          headers: {
            'x-github-token': github_token,
            'x-sonarqube-url': sonarqube_url,
            'x-sonarqube-token': sonarqube_token,
          },
        }
      );

      if (!configResponse.ok) {
        const errorText = await configResponse.text();
        console.error('[CodeGovernance] Config fetch failed:', configResponse.status, errorText);
        throw new Error(`Failed to fetch SonarQube configuration: ${configResponse.status} ${errorText}`);
      }

      const configData = await configResponse.json();
      const config = configData.config;
      console.log('[CodeGovernance] Config fetched:', config);

      // Fetch violations
      console.log('[CodeGovernance] Fetching violations...');
      const violationsResponse = await fetch(
        `/api/v1/code-analysis/violations?owner=${owner}&repo=${repo}&prNumber=${pr.number}&projectKey=${config.projectKey}&branch=${encodeURIComponent(branch)}`,
        {
          headers: {
            'x-github-token': github_token,
            'x-sonarqube-url': sonarqube_url,
            'x-sonarqube-token': sonarqube_token,
          },
        }
      );

      if (!violationsResponse.ok) {
        const errorText = await violationsResponse.text();
        console.error('[CodeGovernance] Violations fetch failed:', violationsResponse.status, errorText);
        throw new Error(`Failed to fetch violations: ${violationsResponse.status} ${errorText}`);
      }

      const violationsData = await violationsResponse.json();
      const violations = violationsData.violations || [];
      const bySeverity = violationsData.summary?.bySeverity || {};

      console.log('[CodeGovernance] Analysis complete:', violations.length, 'violations');

      // Build minimal analysis response
      const analysis: AgentAnalysis = {
        pr: {
          owner,
          repo,
          number: pr.number,
          branch,
          sha: 'latest',
        },
        timestamp: new Date().toISOString(),
        violations: {
          total: violations.length,
          inPR: violations.length,
          list: violations,
          bySeverity,
          byType: violationsData.summary?.byType || {},
        },
        qualityGate: null,
        analysis: {
          repeatedViolations: [],
          hotspotFiles: [],
          regressions: [],
        },
        recommendations: {
          priority: 'medium',
          actions: [],
          estimatedEffort: 'low',
        },
        notification: {
          shouldNotify: false,
          severity: 'low',
          message: '',
        },
      };

      setCodeGovernanceAnalysis(analysis);
    } catch (error) {
      console.error('[CodeGovernance] Analysis failed with error:', error);
      // Check if credentials were actually configured
      const credentials = getCredentials();
      const hasCredentials = credentials?.sonarqube_url && credentials?.sonarqube_token;

      if (!hasCredentials) {
        // Not configured - set to null (expected state)
        setCodeGovernanceAnalysis(null);
      } else {
        // Configured but failed - propagate error so UI can show it
        setCodeGovernanceAnalysis(null);
        throw error;
      }
    }
  };

  /**
   * Execute single analysis task
   */
  const executeTask = async (task: AnalysisTask, pr: PullRequest): Promise<{ duration: number; summary: string }> => {
    const startTime = Date.now();
    const [owner, repo] = pr.repository.split('/');

    // Determine endpoint and input based on task
    let endpoint = '';
    const input: Record<string, any> = { owner, repo, pr_number: pr.number };
    let toolName = '';

    switch (task) {
      case 'risk':
        endpoint = '/api/v1/version-control/pr/risk';
        toolName = 'fetchRiskAssessment';
        break;
      case 'missions':
        endpoint = '/api/v1/version-control/pr/missions';
        toolName = 'fetchReviewMissions';
        break;
      case 'governance':
        endpoint = '/api/v1/code-analysis/violations';
        toolName = 'fetchCodeGovernance';
        break;
    }

    // Record tool start
    const toolId = recordToolStart(task, toolName, input, endpoint);

    try {
      // Update status to running
      setOrchestrator(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.task === task ? { ...t, status: 'running' } : t
        ),
      }));

      // Execute the appropriate fetch
      let result: any;
      switch (task) {
        case 'risk':
          await fetchRiskAssessment(pr);
          result = { status: 'risk fetched' };
          break;
        case 'missions':
          await fetchReviewMissions(pr);
          result = { status: 'missions fetched' };
          break;
        case 'governance':
          await fetchCodeGovernance(pr);
          result = { status: 'governance fetched' };
          break;
      }

      const duration = (Date.now() - startTime) / 1000;

      // Record tool completion
      recordToolEnd(toolId, result);

      // Update status to complete (summary will be generated after state updates)
      setOrchestrator(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.task === task ? { ...t, status: 'complete', duration } : t
        ),
      }));

      return { duration, summary: '' };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide user-friendly messages for common errors
      if (errorMessage.includes('Azure OpenAI not configured')) {
        errorMessage = 'Configure Azure OpenAI in settings';
      } else if (errorMessage.includes('SonarQube')) {
        errorMessage = 'Configure SonarQube in settings';
      } else if (errorMessage.includes('Credentials not found')) {
        errorMessage = 'Check credentials in settings';
      }

      // Record tool error
      recordToolEnd(toolId, null, errorMessage);

      setOrchestrator(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.task === task ? { ...t, status: 'error', duration, error: errorMessage } : t
        ),
      }));

      throw error;
    }
  };

  /**
   * Start autonomous analysis (checks cache first)
   */
  const startAnalysis = useCallback(async () => {
    if (!pr || !files) return;

    // Check if we already have cached data to avoid re-running
    const cachedMissions = await getMissions(pr.number, pr.repository);
    const hasCachedMissions = cachedMissions && cachedMissions.missions.length > 0;

    console.log('[startAnalysis] Cache check:', {
      pr: pr.number,
      hasCachedMissions,
      hasRisk: !!enhancedRisk,
      hasGovernance: !!codeGovernanceAnalysis
    });

    // If we have all data cached, skip the orchestrator entirely
    if (hasCachedMissions && enhancedRisk && codeGovernanceAnalysis !== undefined) {
      console.log('[startAnalysis] All data already loaded from cache, skipping analysis');
      // Load cached missions into state
      if (missions.length === 0) {
        setMissions(cachedMissions.missions);
      }
      return;
    }

    // Analyze PR characteristics
    const characteristics = analyzePRCharacteristics(pr, files);
    const priority = decidePriority(characteristics);
    const reasoning = generateReasoning(characteristics, priority);

    // Filter out tasks that already have data
    // Note: codeGovernanceAnalysis can be null (not configured) or an object (has data)
    // We only skip if it's explicitly not undefined (meaning we've already tried to fetch it)
    const tasksToRun = priority.filter(task => {
      if (task === 'missions' && hasCachedMissions) {
        console.log('[startAnalysis] Skipping missions task - using cache');
        return false;
      }
      if (task === 'risk' && enhancedRisk) {
        console.log('[startAnalysis] Skipping risk task - already loaded');
        return false;
      }
      if (task === 'governance' && codeGovernanceAnalysis !== undefined) {
        console.log('[startAnalysis] Skipping governance task - already loaded/checked');
        return false;
      }
      return true;
    });

    // If no tasks need to run, we're done
    if (tasksToRun.length === 0) {
      console.log('[startAnalysis] No tasks to run, all data available');
      // Load cached missions if not already loaded
      if (hasCachedMissions && missions.length === 0) {
        setMissions(cachedMissions.missions);
      }
      return;
    }

    console.log('[startAnalysis] Running tasks:', tasksToRun.join(', '));

    // Initialize orchestrator with proper summaries
    const initialTasks: AnalysisStatus[] = priority.map(task => {
      const shouldRun = tasksToRun.includes(task);

      if (shouldRun) {
        return { task, status: 'queued', summary: undefined };
      }

      // Task is skipped - provide specific summary
      let summary = 'cached';
      if (task === 'governance' && codeGovernanceAnalysis === null) {
        summary = 'not configured';
      } else if (task === 'missions' && hasCachedMissions) {
        const highPriority = cachedMissions.missions.filter(m => m.priority === 'high').length;
        summary = `${cachedMissions.missions.length} missions, ${highPriority} high`;
      } else if (task === 'risk' && enhancedRisk) {
        summary = `${enhancedRisk.level} risk`;
      }

      return { task, status: 'complete', summary };
    });

    const startTime = Date.now();

    setOrchestrator({
      active: true,
      reasoning,
      tasks: initialTasks,
      startTime,
      trace: {
        tools: [],
        decisions: [],
        timeline: {
          start: startTime,
          events: [
            {
              timestamp: startTime,
              type: 'state_change',
              taskId: 'orchestrator',
              message: 'Analysis started',
            },
          ],
        },
      },
    });

    // Record the priority decision
    const alternatives = ['risk-first', 'missions-first', 'governance-first'];
    recordDecision(
      'priority',
      `Prioritized: ${priority.join(' → ')} (${tasksToRun.length} tasks)`,
      reasoning,
      alternatives
    );

    // Load cached missions immediately if we have them
    if (hasCachedMissions && missions.length === 0) {
      console.log('[startAnalysis] Loading cached missions into state');
      setMissions(cachedMissions.missions);
    }

    // Execute only the tasks that need to run in parallel
    try {
      await Promise.all(tasksToRun.map(task => executeTask(task, pr)));

      // Mark orchestrator as complete
      setOrchestrator(prev => ({
        ...prev,
        active: false,
        endTime: Date.now(),
      }));
    } catch (error) {
      console.error('Orchestrator error:', error);
      setOrchestrator(prev => ({
        ...prev,
        active: false,
        endTime: Date.now(),
      }));
    }
  }, [pr, files, enhancedRisk, codeGovernanceAnalysis, missions]);

  /**
   * Reset analysis state
   */
  const resetAnalysis = useCallback(() => {
    setOrchestrator({
      active: false,
      reasoning: '',
      tasks: [],
      startTime: 0,
      trace: {
        tools: [],
        decisions: [],
        timeline: {
          start: 0,
          events: [],
        },
      },
    });
    setEnhancedRisk(null);
    setMissions([]);
    setCodeGovernanceAnalysis(undefined);
  }, []);

  // Update task summaries when data becomes available
  useEffect(() => {
    setOrchestrator(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => {
        if (task.status === 'complete' && !task.summary) {
          if (task.task === 'risk' && enhancedRisk) {
            return { ...task, summary: `${enhancedRisk.level} risk` };
          } else if (task.task === 'missions' && missions.length > 0) {
            const highPriority = missions.filter(m => m.priority === 'high').length;
            return { ...task, summary: `${missions.length} missions, ${highPriority} high` };
          } else if (task.task === 'governance') {
            // Handle governance: null = not configured, object = has data
            if (codeGovernanceAnalysis === null) {
              return { ...task, summary: 'not configured' };
            } else if (codeGovernanceAnalysis) {
              return { ...task, summary: `${codeGovernanceAnalysis.violations.total} violations` };
            }
          }
        }
        return task;
      }),
    }));
  }, [enhancedRisk, missions, codeGovernanceAnalysis]);

  // Auto-start analysis when PR loads (only if not already running)
  useEffect(() => {
    if (autoStart && pr && files && orchestrator.tasks.length === 0 && !orchestrator.active) {
      startAnalysis();
    }
  }, [autoStart, pr, files]);

  return {
    orchestrator,
    enhancedRisk,
    missions,
    codeGovernanceAnalysis,
    startAnalysis,
    resetAnalysis,
  };
}
