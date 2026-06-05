/**
 * PR Review Page
 * Route: /pr/{owner}/{repo}/{number}
 *
 * Dedicated page for reviewing pull requests with AI guidance
 */
'use client';

import { getChecklistForTechStack, getTechStackLabel, TechStack } from '@/lib/features/review-standards/review-standards';
import { dismissQuickReviewPrompt, formatTechStackList, shouldShowQuickReviewPrompt } from '@/lib/features/review-standards/review-standards-prompt';
import { loadPRCache } from '@/lib/features/trends/pr-cache';
import { useAbortController } from '@/lib/hooks/useAbortController';
import { getMockBlastRadius, getMockHistoricalPatterns, getMockPRContext } from '@/lib/mock-data/intelligence-features';
import { getCredentials } from '@/lib/storage/credentials-storage';
import { deleteTask, getConversation, getTasks, saveMessage, saveTask, Task, updateMissionStatus, updateTask } from '@/lib/storage/indexeddb-storage';
import { Mission, PullRequest, CommentThread, CommentStats } from '@/lib/types/github';
import { apiGet } from '@/lib/utils/api-client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
// Component imports
import { CodeGovernancePanel } from '@/components/features/code-governance';
import AgentObservatory from './components/AgentObservatory';
import AgentOrchestrator from './components/AgentOrchestrator';
import ChatPanel from './components/ChatPanel';
import FilesPanel from './components/FilesPanel';
import IntelligenceBar from './components/IntelligenceBar';
import PRHeader from './components/PRHeader';
import ReviewMissionsPanel from './components/ReviewMissionsPanel';
import RiskAssessmentPanel from './components/RiskAssessmentPanel';
import { type ToolExecution } from './components/ToolTrace';
import { useAutonomousAnalysis } from './hooks/useAutonomousAnalysis';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface Check {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
}

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  url: string;
}

interface PRDetails {
  commits: Commit[];
  checks: Check[];
  files: FileChange[];
}

type Tab = 'files' | 'commits' | 'checks' | 'comments' | 'tasks';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTime?: number; // Response time in seconds
  isStreaming?: boolean; // Whether this message is currently streaming
  aborted?: boolean; // Whether this message was interrupted
  toolExecutions?: ToolExecution[]; // Tool calls made before this response
}

export default function PRReviewPage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const prNumber = parseInt(params.number as string);

  const [pr, setPr] = useState<PullRequest | null>(null);
  const [details, setDetails] = useState<PRDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [targetFile, setTargetFile] = useState<string | null>(null);

  // Files tab state - persisted across tab switches
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Autonomous analysis hook - handles risk, missions, and governance automatically
  const {
    orchestrator,
    enhancedRisk,
    missions,
    codeGovernanceAnalysis,
  } = useAutonomousAnalysis(pr, details?.files, true);

  // AI Panel state - auto-expand when orchestrator completes
  const [riskExpanded, setRiskExpanded] = useState(false);
  const [missionsExpanded, setMissionsExpanded] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isAzureConfigured, setIsAzureConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const streamBufferRef = useRef<string>('');
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const [streamingCharCount, setStreamingCharCount] = useState(0);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Centralized abort controller hook
  const { getSignal, isAbortError } = useAbortController();

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [selectedShortcuts, setSelectedShortcuts] = useState<string[]>([]);

  // Comments state
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const [commentStats, setCommentStats] = useState<CommentStats>({ total: 0, resolved: 0, unresolved: 0 });
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Quick Review prompt state
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [detectedTechStacks, setDetectedTechStacks] = useState<TechStack[]>([]);

  // Observatory state
  const [observatoryOpen, setObservatoryOpen] = useState(false);

  // Queue navigation state
  const [queueContext, setQueueContext] = useState<{
    hasPrevious: boolean;
    hasNext: boolean;
    previous: { number: number; owner: string; repo: string } | null;
    next: { number: number; owner: string; repo: string } | null;
  } | null>(null);

  // Check Azure configuration
  const checkAzureConfigured = () => {
    const creds = getCredentials();
    return !!(
      creds &&
      creds.azure_openai_endpoint &&
      creds.azure_openai_key &&
      creds.azure_openai_deployment &&
      creds.azure_openai_api_version
    );
  };

  // Load queue context from session storage
  useEffect(() => {
    const queueData = sessionStorage.getItem('pr-queue');
    if (!queueData) {
      setQueueContext({
        hasPrevious: false,
        hasNext: false,
        previous: null,
        next: null,
      });
      return;
    }

    try {
      const { prs } = JSON.parse(queueData);
      const currentIndex = prs.findIndex((p: any) => p.number === prNumber);

      setQueueContext({
        hasPrevious: currentIndex > 0,
        hasNext: currentIndex < prs.length - 1,
        previous: currentIndex > 0 ? prs[currentIndex - 1] : null,
        next: currentIndex < prs.length - 1 ? prs[currentIndex + 1] : null,
      });
    } catch (err) {
      console.error('Failed to parse queue context:', err);
      setQueueContext({
        hasPrevious: false,
        hasNext: false,
        previous: null,
        next: null,
      });
    }
  }, [prNumber]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setLoadingSteps([]);
      setError('');
      setIsAzureConfigured(checkAzureConfigured());

      try {
        const creds = getCredentials();
        if (!creds || !creds.github_token) {
          throw new Error('GitHub credentials not configured');
        }

        setLoadingSteps(prev => [...prev, `[●] Fetching PR #${prNumber}...`]);

        const [completeData, conversation, tasks] = await Promise.all([
          apiGet<{
            pr: PullRequest;
            details: PRDetails;
            comments: {
              threads: CommentThread[];
              generalComments: any[];
              stats: CommentStats;
            };
          }>(`/api/v1/version-control/pr/complete?owner=${owner}&repo=${repo}&number=${prNumber}`, creds),
          getConversation(prNumber, `${owner}/${repo}`).catch(() => []),
          getTasks(prNumber, `${owner}/${repo}`).catch(() => []),
        ]);

        const cachedPRs = loadPRCache(60);
        const cachedPR = cachedPRs?.find(
          p => p.number === completeData.pr.number && p.repository === completeData.pr.repository
        );

        const prWithRisk = {
          ...completeData.pr,
          risk_score: cachedPR?.risk_score,
          risk_breakdown: cachedPR?.risk_breakdown,
        };

        setPr(prWithRisk);
        setDetails(completeData.details);
        setCommentThreads(completeData.comments.threads);
        setCommentStats(completeData.comments.stats);

        if (conversation.length > 0) {
          const formattedMessages = conversation
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }));
          setMessages(formattedMessages);
        }

        setTasks(tasks);

        setLoadingSteps(prev => [...prev, `[✓] Fetched PR metadata`]);
        setLoadingSteps(prev => [...prev, `[✓] Loaded ${completeData.details.files.length} files`]);
        setLoadingSteps(prev => [...prev, `[✓] Loaded ${completeData.details.commits.length} commits`]);
        setLoadingSteps(prev => [...prev, `[✓] Loaded ${completeData.details.checks.length} CI checks`]);
        setLoadingSteps(prev => [...prev, `[✓] Loaded ${completeData.comments.stats.total} comments`]);
      } catch (err) {
        console.error('Error loading PR data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PR');
      } finally {
        setLoading(false);
        setCommentsLoading(false);
      }
    };

    loadAllData();

    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [owner, repo, prNumber]);

  const loadTasks = async () => {
    try {
      const loadedTasks = await getTasks(prNumber, `${owner}/${repo}`);
      setTasks(loadedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  // Check if Quick Review prompt should be shown
  useEffect(() => {
    if (!pr || !details) return;

    const result = shouldShowQuickReviewPrompt(
      owner,
      repo,
      prNumber,
      details.files,
      pr.additions || 0
    );

    if (result.show && result.techStacks) {
      setShowQuickReview(true);
      setDetectedTechStacks(result.techStacks);
    }
  }, [pr, details, owner, repo, prNumber]);

  // Accordion pattern: toggle handlers
  const handleToggleRisk = () => {
    if (!riskExpanded) {
      // Expanding risk, collapse missions
      setMissionsExpanded(false);
    }
    setRiskExpanded(!riskExpanded);
  };

  const handleToggleMissions = () => {
    if (!missionsExpanded) {
      // Expanding missions, collapse risk
      setRiskExpanded(false);
    }
    setMissionsExpanded(!missionsExpanded);
  };

  // Missions are now auto-generated by orchestrator on PR load
  // This handler kept for manual regeneration if needed
  const handleGenerateMissions = async () => {
    // Note: Missions are auto-generated by orchestrator
    // Manual regeneration not yet implemented
    console.log('Manual mission generation triggered - orchestrator handles this automatically');
  };

  const handleMissionStatusChange = async (missionId: string, status: 'pending' | 'complete' | 'skipped') => {
    // Note: Missions from orchestrator are read-only in current implementation
    // Would need to update orchestrator state to persist changes
    await updateMissionStatus(prNumber, `${owner}/${repo}`, missionId, status);
  };

  const handleAskAI = (mission: Mission) => {
    const context = `Regarding ${mission.file}${mission.line ? `:${mission.line}` : ''} (${mission.title}):\n\n${mission.why}\n\n`;
    setUserInput(context);
    // Scroll to chat input
    const chatInput = document.querySelector('textarea[placeholder="$ query..."]') as HTMLTextAreaElement;
    if (chatInput) {
      chatInput.focus();
    }
  };

  const handleJumpToFile = (filename: string, _line?: number) => {
    setActiveTab('files');
    // Clear and set target file to trigger scroll in FilesTabContent
    setTargetFile(null);
    setTimeout(() => {
      setTargetFile(filename);
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !pr) return;

    const userMessage: Message = {
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setAiLoading(true);
    setAiError('');

    try {
      const creds = getCredentials();
      if (!creds) throw new Error('Credentials not configured');

      await saveMessage({
        pr_number: prNumber,
        repository: `${owner}/${repo}`,
        role: 'user',
        content: userMessage.content,
      });

      // Use new API endpoint with tool support
      const response = await fetch('/api/v1/ai/chat-with-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': creds.github_token,
          'x-azure-endpoint': creds.azure_openai_endpoint || '',
          'x-azure-api-key': creds.azure_openai_key || '',
          'x-azure-deployment': creds.azure_openai_deployment || '',
          'x-azure-api-version': creds.azure_openai_api_version || '',
        },
        body: JSON.stringify({
          repository: `${owner}/${repo}`,
          prNumber,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          missions: missions.map(m => ({
            id: m.id,
            title: m.title,
            category: m.category,
            priority: m.priority,
            status: m.status,
            file: m.file,
            line: m.line,
            why: m.why || '',
          })),
        }),
        signal: getSignal('chat-stream'),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      // Start streaming tracking
      streamStartTimeRef.current = Date.now();
      console.log('[Stream] Starting stream, isStreamActive set to true');
      setIsStreamActive(true);
      setStreamingCharCount(0);

      let assistantContent = '';
      const toolExecutions: ToolExecution[] = [];
      let currentToolExecution: Partial<ToolExecution> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const event = JSON.parse(line);

            // Debug: Log all events
            console.log('[Stream] Event received:', event.type, event.content?.length || '');

            if (event.type === 'tool_call_start') {
              // Start new tool execution
              currentToolExecution = {
                tool: event.toolName,
                args: event.args,
                status: 'running',
              };
              toolExecutions.push(currentToolExecution as ToolExecution);

              // Update messages to show tool trace
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  return [...prev.slice(0, -1), {
                    ...lastMessage,
                    toolExecutions: [...toolExecutions],
                    isStreaming: true,
                  }];
                }
                return [...prev, {
                  role: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  toolExecutions: [...toolExecutions],
                  isStreaming: true,
                }];
              });
            } else if (event.type === 'tool_call_result') {
              // Update tool execution with result
              if (currentToolExecution) {
                currentToolExecution.result = event.result;
                currentToolExecution.duration = event.duration;
                currentToolExecution.status = 'complete';

                // Update messages
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    return [...prev.slice(0, -1), {
                      ...lastMessage,
                      toolExecutions: [...toolExecutions],
                      isStreaming: true,
                    }];
                  }
                  return prev;
                });
              }
            } else if (event.type === 'content_chunk') {
              // Stream content
              assistantContent += event.content;
              streamBufferRef.current = assistantContent;

              // Debug: Log streaming progress
              console.log('[Stream] Received char, total length:', assistantContent.length);
              setStreamingCharCount(assistantContent.length);

              if (streamTimerRef.current) clearTimeout(streamTimerRef.current);

              streamTimerRef.current = setTimeout(() => {
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    return [...prev.slice(0, -1), {
                      ...lastMessage,
                      content: streamBufferRef.current,
                      toolExecutions: [...toolExecutions],
                      isStreaming: true,
                    }];
                  }
                  return [...prev, {
                    role: 'assistant',
                    content: streamBufferRef.current,
                    timestamp: new Date(),
                    toolExecutions: [...toolExecutions],
                    isStreaming: true,
                  }];
                });
              }, 50);
            } else if (event.type === 'done') {
              // Done
              break;
            } else if (event.type === 'error') {
              throw new Error(event.error || 'Unknown error');
            }
          } catch (parseError) {
            console.error('Failed to parse event:', line, parseError);
          }
        }
      }

      // Calculate response time
      const responseTime = (Date.now() - streamStartTimeRef.current) / 1000;
      setIsStreamActive(false);

      const finalMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        responseTime,
        isStreaming: false,
        toolExecutions: toolExecutions.length > 0 ? toolExecutions : undefined,
      };

      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          return [...prev.slice(0, -1), finalMessage];
        }
        return [...prev, finalMessage];
      });

      await saveMessage({
        pr_number: prNumber,
        repository: `${owner}/${repo}`,
        role: 'assistant',
        content: assistantContent,
      });
    } catch (err) {
      // Handle abort errors - save partial message with interrupted state
      if (isAbortError(err)) {
        console.log('[PRDetails] Chat request aborted (user navigated away)');

        const partialContent = streamBufferRef.current;
        const abortTime = (Date.now() - streamStartTimeRef.current) / 1000;

        // Save interrupted message to state and IndexedDB
        if (partialContent) {
          const interruptedMessage: Message = {
            role: 'assistant',
            content: partialContent,
            timestamp: new Date(),
            responseTime: abortTime,
            aborted: true,
            isStreaming: false,
          };

          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [...prev.slice(0, -1), interruptedMessage];
            }
            return [...prev, interruptedMessage];
          });

          await saveMessage({
            pr_number: prNumber,
            repository: `${owner}/${repo}`,
            role: 'assistant',
            content: partialContent,
          });
        }

        return;
      }
      console.error('Error sending message:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setAiLoading(false);
      setIsStreamActive(false);
      setStreamingCharCount(0);
      streamBufferRef.current = '';
      streamStartTimeRef.current = 0;
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }
  };

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;

    try {
      await saveTask({
        pr_number: prNumber,
        repository: `${owner}/${repo}`,
        description: taskInput.trim(),
        completed: false,
      });
      setTaskInput('');
      await loadTasks(); // Reload tasks
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleToggleTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const updates: Partial<Task> = {
        completed: !task.completed,
        completed_at: !task.completed ? Date.now() : undefined,
      };
      await updateTask(taskId, updates);
      await loadTasks(); // Reload tasks
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      await loadTasks(); // Reload tasks
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggleShortcut = (shortcut: string) => {
    setSelectedShortcuts(prev => {
      if (prev.includes(shortcut)) {
        return prev.filter(s => s !== shortcut);
      } else {
        return [...prev, shortcut];
      }
    });
  };

  const handleAddSelectedShortcuts = async () => {
    if (selectedShortcuts.length === 0) return;

    try {
      // Add all selected shortcuts as tasks
      for (const shortcut of selectedShortcuts) {
        await saveTask({
          pr_number: prNumber,
          repository: `${owner}/${repo}`,
          description: shortcut,
          completed: false,
        });
      }
      setSelectedShortcuts([]);
      await loadTasks(); // Reload tasks
    } catch (err) {
      console.error('Failed to add shortcut tasks:', err);
    }
  };

  const handleQuickReview = async () => {
    if (!pr || !details) return;

    // Compose the review prompt with best practices
    let prompt = `Review this PR against best practices for ${formatTechStackList(detectedTechStacks)}.\n\n`;

    const stacksWithoutStandards: string[] = [];

    // Add checklist items for each detected tech stack
    for (const techStack of detectedTechStacks) {
      const checklist = getChecklistForTechStack(techStack);

      if (checklist.length === 0) {
        // No standards available for this tech stack
        stacksWithoutStandards.push(getTechStackLabel(techStack));
      } else {
        prompt += `## ${getTechStackLabel(techStack)} Best Practices\n\n`;

        for (const category of checklist) {
          prompt += `### ${category.name}\n`;
          for (const item of category.items) {
            prompt += `- ${item.text}\n`;
          }
          prompt += '\n';
        }
      }
    }

    // Add note for tech stacks without standards
    if (stacksWithoutStandards.length > 0) {
      prompt += `\n[~] ${stacksWithoutStandards.join(', ')} standards evolving\n\n`;
      prompt += `Note: Review checklist for ${stacksWithoutStandards.join(', ')} is still being developed. Please review based on general best practices.\n\n`;
    }

    prompt += `\n## Files Changed\n`;
    for (const file of details.files.slice(0, 5)) { // Limit to first 5 files to avoid token overflow
      prompt += `- ${file.filename} (+${file.additions} -${file.deletions})\n`;
    }
    if (details.files.length > 5) {
      prompt += `- ... and ${details.files.length - 5} more files\n`;
    }

    prompt += `\nPlease review the code changes and provide feedback based on the above best practices.`;

    // Set the input and trigger send
    setUserInput(prompt);
    setShowQuickReview(false); // Dismiss the prompt

    // Wait a tick for state to update, then trigger send
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleDismissQuickReview = (dismissType: 'this-pr' | 'temporary') => {
    dismissQuickReviewPrompt(owner, repo, prNumber, dismissType);
    setShowQuickReview(false);
  };

  const handlePreviousPR = () => {
    if (queueContext?.previous) {
      router.push(`/pr/${queueContext.previous.owner}/${queueContext.previous.repo}/${queueContext.previous.number}`);
    }
  };

  const handleNextPR = () => {
    if (queueContext?.next) {
      router.push(`/pr/${queueContext.next.owner}/${queueContext.next.repo}/${queueContext.next.number}`);
    }
  };

  const handleClearChat = async () => {
    try {
      // Clear from IndexedDB
      const { deleteConversation } = await import('@/lib/storage/indexeddb-storage');
      await deleteConversation(prNumber, `${owner}/${repo}`);

      // Clear from state
      setMessages([]);
      setShowClearConfirm(false);
      setUserInput('');
      setAiError('');
    } catch (err) {
      console.error('Failed to clear conversation:', err);
      setAiError('Failed to clear conversation');
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="h-screen" style={{ backgroundColor: 'var(--surface-base)' }}>
        <div className="container mx-auto h-full flex items-center justify-center">
          <div className="font-mono text-sm space-y-1">
            {loadingSteps.map((step, index) => (
              <div
                key={index}
                style={{
                  color: step.includes('[✓]') ? 'var(--status-approved)' : 'var(--text-secondary)',
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="h-screen" style={{ backgroundColor: 'var(--surface-base)' }}>
        <div className="container mx-auto h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg mb-2" style={{ color: 'var(--diff-deletion)' }}>Error</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'PR not found'}</div>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 border rounded text-sm"
              style={{ borderColor: 'var(--border-standard)', color: 'var(--text-primary)' }}
            >
              Back to Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const highPriorityCount = missions.filter(m => m.priority === 'high').length;

  return (
    <div className="container mx-auto h-full flex flex-col" style={{ backgroundColor: 'var(--surface-base)' }}>
      {/* PR Header */}
      <PRHeader
        pr={pr}
        queueContext={queueContext}
        onBackToQueue={() => router.push('/')}
        onPreviousPR={handlePreviousPR}
        onNextPR={handleNextPR}
      />

      {/* Intelligence Bar */}
      <IntelligenceBar
        context={getMockPRContext(prNumber)}
        blastRadius={getMockBlastRadius(prNumber)}
        patterns={getMockHistoricalPatterns(prNumber)}
        missionCount={missions.length}
      />

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Files/Tabs Panel */}
        <FilesPanel
          prNumber={prNumber}
          activeTab={activeTab}
          details={details}
          targetFile={targetFile}
          expandedDirs={expandedDirs}
          expandedFiles={expandedFiles}
          tasks={tasks}
          taskInput={taskInput}
          selectedShortcuts={selectedShortcuts}
          commentThreads={commentThreads}
          commentStats={commentStats}
          commentsLoading={commentsLoading}
          onActiveTabChange={setActiveTab}
          onExpandedDirsChange={setExpandedDirs}
          onExpandedFilesChange={setExpandedFiles}
          onTaskInputChange={setTaskInput}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onToggleShortcut={handleToggleShortcut}
          onAddSelectedShortcuts={handleAddSelectedShortcuts}
        />

        {/* Column 2: Risk + Missions Sidebar */}
        <div className="w-[25%] h-full flex flex-col border-r" style={{ overflowY: 'auto', borderColor: 'var(--border-standard)' }}>
          <div style={{ flex: 'none' }}>
            {/* Autonomous Agent Orchestrator */}
            <AgentOrchestrator
              orchestrator={orchestrator}
              onToggleObservatory={() => setObservatoryOpen(!observatoryOpen)}
            />

            <RiskAssessmentPanel
              pr={pr}
              riskExpanded={riskExpanded}
              enhancedRisk={enhancedRisk}
              riskBreakdownLoading={orchestrator.tasks.find(t => t.task === 'risk')?.status === 'running'}
              riskBreakdownError={orchestrator.tasks.find(t => t.task === 'risk')?.error || null}
              onToggleRisk={handleToggleRisk}
            />

            <ReviewMissionsPanel
              pr={pr}
              missions={missions}
              missionsExpanded={missionsExpanded}
              missionsLoading={orchestrator.tasks.find(t => t.task === 'missions')?.status === 'running'}
              missionsError={orchestrator.tasks.find(t => t.task === 'missions')?.error || null}
              missionsGenerated={missions.length > 0}
              isAzureConfigured={isAzureConfigured}
              highPriorityCount={highPriorityCount}
              onToggleMissions={handleToggleMissions}
              onGenerateMissions={handleGenerateMissions}
              onMissionStatusChange={handleMissionStatusChange}
              onAskAI={handleAskAI}
              onJumpToFile={handleJumpToFile}
            />

            <CodeGovernancePanel
              pr={pr}
              analysis={codeGovernanceAnalysis}
              loading={orchestrator.tasks.find(t => t.task === 'governance')?.status === 'running'}
              error={orchestrator.tasks.find(t => t.task === 'governance')?.error || null}
              onJumpToFile={handleJumpToFile}
            />
          </div>
        </div>

        {/* Column 3: Chat Panel */}
        <ChatPanel
          prNumber={prNumber}
          messages={messages}
          userInput={userInput}
          aiLoading={aiLoading}
          aiError={aiError}
          isAzureConfigured={isAzureConfigured}
          streamingCharCount={streamingCharCount}
          isStreamActive={isStreamActive}
          showClearConfirm={showClearConfirm}
          showQuickReview={showQuickReview}
          detectedTechStacks={detectedTechStacks}
          onUserInputChange={setUserInput}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onShowClearConfirm={setShowClearConfirm}
          onQuickReview={handleQuickReview}
          onDismissQuickReview={handleDismissQuickReview}
        />
      </div>

      {/* Agent Observatory - Slide-in drawer */}
      <AgentObservatory
        isOpen={observatoryOpen}
        orchestrator={orchestrator}
        onClose={() => setObservatoryOpen(false)}
      />
    </div>
  );
}
