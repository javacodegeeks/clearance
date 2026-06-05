'use client';

import { getCredentials, hasCredentials } from '@/lib/storage/credentials-storage';
import { getTaskCounts } from '@/lib/storage/indexeddb-storage';
import { generateChecksum, getCachedChecksum, getCachedTimestamp, loadPRCache, savePRCache } from '@/lib/features/trends/pr-cache';
import { getSettings } from '@/lib/config/settings';
import { PullRequest } from '@/lib/types/github';
import { apiGetStream, githubApiGet } from '@/lib/utils/api-client';
import { getWatchedRepos } from '@/lib/storage/watched-repos-client';
import { dismissWelcomeBanner, isWelcomeBannerDismissed } from '@/lib/storage/welcome-banner-storage';
import { detectStalePRs, getNotifiedStalePRs, saveNotifiedStalePRs } from '@/lib/features/pr-queue/stale-detection';
import { notificationService } from '@/lib/services/notifications/notification-service';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from '@/components/ui/empty-state';
import InfoBanner from '@/components/ui/info-banner';
import { SkeletonLoader } from '@/components/ui';

type SortField = 'repository' | 'author' | 'age' | 'priority';
type SortDirection = 'asc' | 'desc';

// Priority calculation (moved outside component for performance)
function calculatePriorityScore(pr: PullRequest): number {
  // Risk score (0-10) - 40% weight
  const riskScore = pr.risk_score ?? 5.0;

  // Age factor (0-10) - 30% weight
  // Normalize to 0-10 scale, max at 14 days
  const ageDays = (Date.now() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const ageScore = Math.min(ageDays / 14, 1) * 10;

  // CI penalty (0 or 10) - 20% weight
  // Failing CI = urgent attention needed
  const ciPenalty = pr.ci_status === 'failure' ? 10 : 0;

  // Activity score (0-10) - 10% weight
  // Unresolved comments = needs attention
  const unresolvedComments = (pr.comments?.total ?? 0) - (pr.comments?.resolved ?? 0);
  const activityScore = Math.min(unresolvedComments / 5, 1) * 10;

  return (0.4 * riskScore) + (0.3 * ageScore) + (0.2 * ciPenalty) + (0.1 * activityScore);
}

// Priority display helpers
function getPriorityColor(priority: number): string {
  if (priority >= 8) return 'var(--diff-deletion)'; // Critical (red)
  if (priority >= 6) return 'var(--status-needs-review)'; // High (yellow)
  if (priority >= 4) return 'var(--status-approved)'; // Medium (green)
  return 'var(--text-muted)'; // Low (gray)
}

function getPriorityOpacity(priority: number): number {
  if (priority >= 8) return 1.0; // Critical - full opacity
  if (priority >= 6) return 0.95; // High - near full
  if (priority >= 4) return 0.85; // Medium - slightly reduced
  return 0.6; // Low - muted
}

// Helper functions (moved outside component for performance)
function getStatusColor(status?: string): string {
  switch (status) {
    case 'awaiting_review': return 'var(--status-needs-review)';
    case 'approved_by_me': return 'var(--status-approved)';
    case 'merged': return 'var(--status-merged)';
    default: return 'var(--text-muted)';
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'awaiting_review': return 'Needs Review';
    case 'approved_by_me': return 'Approved';
    case 'merged': return 'Merged';
    default: return status || '';
  }
}

function getCIStatusIcon(status?: string): { icon: string; color: string; label: string } {
  switch (status) {
    case 'success':
      return { icon: '✓', color: 'var(--status-approved)', label: 'All checks passed' };
    case 'failure':
      return { icon: '✗', color: 'var(--diff-deletion)', label: 'Checks failed' };
    case 'pending':
      return { icon: '●', color: 'var(--status-needs-review)', label: 'Checks running' };
    default:
      return { icon: '−', color: 'var(--text-muted)', label: 'No checks' };
  }
}

export default function PRQueue() {
  const router = useRouter();
  const [prs, setPRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'awaiting_review' | 'approved_by_me' | 'merged'>('all');
  const [hideAlreadyApproved, setHideAlreadyApproved] = useState(false);
  const [sortField, setSortField] = useState<SortField>('age');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [watchedRepos, setWatchedRepos] = useState<string[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
  const [staleBannerDismissed, setStaleBannerDismissed] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [, forceUpdate] = useState({});
  const [taskCounts, setTaskCounts] = useState<Map<string, number>>(new Map());
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [stalePRs, setStalePRs] = useState<Set<number>>(new Set());
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  const watchedReposRef = useRef<string[]>([]);
  const prsRef = useRef<PullRequest[]>([]);

  const handleRowClick = (pr: PullRequest, currentPRs: PullRequest[]) => {
    // Don't navigate for merged PRs - no action needed
    if (pr.review_status === 'merged') {
      return;
    }

    // Save queue context to session storage for navigation
    // Filter to only include open PRs (awaiting_review) - exclude approved and merged
    const openPRs = currentPRs.filter(p => p.review_status === 'awaiting_review');
    const queuePRs = openPRs.map(p => ({
      number: p.number,
      owner: p.repository.split('/')[0],
      repo: p.repository.split('/')[1],
    }));

    sessionStorage.setItem('pr-queue', JSON.stringify({
      prs: queuePRs,
      current: pr.number,
    }));

    // Navigate to PR details page
    const [owner, repo] = pr.repository.split('/');
    router.push(`/pr/${owner}/${repo}/${pr.number}`);
  };


  const loadTaskCounts = async () => {
    if (prs.length === 0) return;

    try {
      const prRefs = prs.map(pr => ({ pr_number: pr.number, repository: pr.repository }));
      const counts = await getTaskCounts(prRefs);
      setTaskCounts(counts);
    } catch (err) {
      console.error('[PRQueue] Failed to load task counts:', err);
    }
  };


  // Helper functions moved to module scope (above component) for performance

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedPRs = (prs: PullRequest[]) => {
    return [...prs].sort((a, b) => {
      if (sortField === 'priority') {
        // Sort by calculated priority score
        const aPriority = calculatePriorityScore(a);
        const bPriority = calculatePriorityScore(b);
        return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      }

      if (sortField === 'age') {
        // Sort by created_at timestamp
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      let aValue: string;
      let bValue: string;

      if (sortField === 'repository') {
        aValue = a.repository.toLowerCase();
        bValue = b.repository.toLowerCase();
      } else {
        aValue = a.user.login.toLowerCase();
        bValue = b.user.login.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;

    if (isActive) {
      return (
        <span className="ml-1 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      );
    }

    // Show inactive sort indicator
    return (
      <span className="ml-1 font-mono text-xs opacity-40" style={{ color: 'var(--text-tertiary)' }}>
        ↕
      </span>
    );
  };

  const dismissWelcomeBannerPermanently = () => {
    setShowWelcomeBanner(false);
    dismissWelcomeBanner();
  };

  const SkeletonRow = () => (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="col-span-1 flex items-center">
        <SkeletonLoader width="w-8" height="h-3" />
      </div>
      <div className="col-span-3 flex items-center gap-2">
        <SkeletonLoader width="w-12" height="h-3" />
        <SkeletonLoader width="flex-1" height="h-3" />
      </div>
      <div className="col-span-2 flex items-center">
        <SkeletonLoader width="w-3/4" height="h-3" />
      </div>
      <div className="col-span-2 flex items-center">
        <SkeletonLoader width="w-2/3" height="h-3" />
      </div>
      <div className="col-span-1 flex items-center">
        <SkeletonLoader width="w-8" height="h-3" />
      </div>
      <div className="col-span-1 flex items-center justify-center">
        <SkeletonLoader width="w-3" height="h-3" />
      </div>
      <div className="col-span-1 flex items-center">
        <SkeletonLoader width="w-10" height="h-3" />
      </div>
      <div className="col-span-1 flex items-center">
        <SkeletonLoader width="w-2" height="h-2" rounded="rounded-full" />
      </div>
    </div>
  );

  const fetchPRs = async (isRetry = false) => {
    // Use ref to get latest watched repos (state may not be updated yet on initial load)
    const currentWatchedRepos = watchedReposRef.current;

    // Safety check: Don't fetch if no watched repos are configured
    if (currentWatchedRepos.length === 0) {
      setLoading(false);
      setStreaming(false);
      return;
    }

    try {
      // Clear existing data on fresh fetch
      if (!isRetry) {
        setPRs([]);
      }

      setLoading(true);
      if (isRetry) {
        setError('Retrying...');
      }

      // Get credentials from browser storage
      const credentials = getCredentials();
      if (!credentials || !credentials.github_token) {
        setError('GitHub token not configured. Please update settings.');
        setLoading(false);
        setStreaming(false);
        return;
      }

      // Build API URL with watched repos from ref
      const apiUrl = currentWatchedRepos.length > 0
        ? `/api/v1/version-control/prs-stream?repos=${encodeURIComponent(JSON.stringify(currentWatchedRepos))}`
        : '/api/v1/version-control/prs-stream';

      const res = await apiGetStream(apiUrl, credentials);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const foundPRs: PullRequest[] = [];

      if (!reader) {
        throw new Error('No reader available');
      }

      setStreaming(true);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line === 'DONE') {
            setStreaming(false);
            continue;
          }

          try {
            const pr = JSON.parse(line);

            if (pr.error) {
              console.error('[PRQueue] Received error:', pr.error);
              setError(pr.error);
              setLoading(false);
              setStreaming(false);
              continue;
            }

            foundPRs.push(pr);

            setPRs([...foundPRs]);
            setLoading(false);
          } catch (parseError) {
            console.error('[PRQueue] Error parsing PR:', parseError);
          }
        }
      }

      setPRs(foundPRs);
      savePRCache(foundPRs); // Save to cache
      const now = Date.now();
      setCacheTimestamp(now); // Update cache timestamp
      lastCheckRef.current = now; // Update last check time
      setStaleBannerDismissed(false); // Reset banner dismissal
      setError('');
      setRetryCount(0);
      setLoading(false);
      setStreaming(false);
      runStaleDetection(foundPRs);
    } catch (err) {
      console.error('[PRQueue] Fetch error:', err);
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setError(`Failed to fetch PRs. Retrying in ${delay / 1000}s...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      } else {
        setError('Failed to fetch PRs after multiple retries. Please check your connection.');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (retryCount > 0 && retryCount <= 3 && watchedReposRef.current.length > 0) {
      fetchPRs(true);
    }
  }, [retryCount]);

  // Update refs when state changes
  useEffect(() => {
    watchedReposRef.current = watchedRepos;
  }, [watchedRepos]);

  useEffect(() => {
    prsRef.current = prs;
  }, [prs]);

  // Load task counts when PRs change
  useEffect(() => {
    if (prs.length > 0) {
      loadTaskCounts();
    }
  }, [prs]);

  // Initial load: check credentials and load watched repos on mount (client-side only)
  useEffect(() => {
    async function initialize() {
      // Redirect first-time users to onboarding wizard
      if (!hasCredentials() && !localStorage.getItem('onboardingCompleted')) {
        router.push('/onboarding');
        return;
      }

      // Check credentials first (synchronous)
      setCredentialsConfigured(hasCredentials());

      // Fetch GitHub username if credentials are available
      if (hasCredentials()) {
        try {
          const creds = getCredentials();
          if (creds?.github_token) {
            const userData = await githubApiGet<{ login: string }>('https://api.github.com/user', creds.github_token);
            setGithubUsername(userData.login);
          }
        } catch (error) {
          console.error('[PRQueue] Failed to fetch GitHub user:', error);
        }
      }

      // Load watched repos (localStorage access is synchronous despite async function)
      const watched = await getWatchedRepos();
      setWatchedRepos(watched);
      watchedReposRef.current = watched;

      // Mark as mounted after loading data to prevent flash
      setMounted(true);

      // Check if welcome banner should be shown
      if (!isWelcomeBannerDismissed()) {
        setShowWelcomeBanner(true);
      }

      if (watched.length === 0) {
        return;
      }

      // Initialize lastCheckRef from cache or fallback to now
      try {
        const timestamp = getCachedTimestamp();
        if (timestamp) {
          lastCheckRef.current = timestamp;
        } else {
          lastCheckRef.current = Date.now();
        }
      } catch (error) {
        console.error('[PRQueue] Failed to read cache timestamp:', error);
        lastCheckRef.current = Date.now();
      }

      const settings = getSettings();
      const cached = loadPRCache(settings.cacheDuration);

      if (cached && cached.length > 0) {
        setPRs(cached);
        setLoading(false);
      } else if (cached === null) {
        // Cache expired or missing - auto-fetch on initial load
        fetchPRs(false);
      }
    }

    initialize();

    // Cleanup on unmount
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      if (statusUpdateTimerRef.current) clearInterval(statusUpdateTimerRef.current);
    };
  }, []);

  // Update status line with smart interval (respects polling interval and cache duration)
  useEffect(() => {
    // Don't start timer until component is mounted and watched repos are loaded
    // Use ref to check if repos are loaded (avoids dependency on watchedRepos array)
    if (!mounted || watchedReposRef.current.length === 0) {
      return;
    }

    const updateStatusLine = () => {
      const settings = getSettings();
      const intervalMs = settings.pollingInterval * 60 * 1000;
      const cacheMaxAge = settings.cacheDuration * 60 * 1000;

      // Read timestamp from cache for accuracy
      let timestamp = lastCheckRef.current;
      try {
        const cachedTimestamp = getCachedTimestamp();
        if (cachedTimestamp) {
          timestamp = cachedTimestamp;
          lastCheckRef.current = timestamp; // Update ref
        }
      } catch (error) {
        // Use ref value as fallback
      }

      const timeSinceLastCheck = Date.now() - timestamp;
      forceUpdate({}); // Force re-render to update "Last updated" time

      // Trigger poll when countdown reaches 0 and polling interval has passed
      if (timeSinceLastCheck >= intervalMs) {
        // Don't poll if tab is hidden (save resources)
        if (document.hidden) {
          return;
        }

        // Calculate cache age to avoid unnecessary API calls
        const cacheAge = timeSinceLastCheck; // Same as time since last check
        const cacheAgePercent = (cacheAge / cacheMaxAge) * 100;


        // Only poll if cache is getting stale (> 50% of cache duration)
        if (cacheAgePercent > 50) {

          // Check if cache is expired
          const cached = loadPRCache(settings.cacheDuration);

          if (!cached || cached.length === 0) {
            // Cache expired - do full fetch
            fetchPRs(false);
          } else {
            // Cache valid - do incremental check (silent)
            checkForUpdates();
          }
        } else {
        }
      }
    };

    const settings = getSettings();
    // Smart interval: Check every minute OR every 1/6 of polling interval (whichever is smaller)
    // This ensures smooth countdown updates while respecting long polling intervals
    const updateInterval = Math.min(60000, (settings.pollingInterval * 60 * 1000) / 6);


    // Update immediately
    updateStatusLine();

    // Update at smart interval
    statusUpdateTimerRef.current = setInterval(updateStatusLine, updateInterval);

    return () => {
      if (statusUpdateTimerRef.current) clearInterval(statusUpdateTimerRef.current);
    };
  }, [cacheTimestamp, mounted]);

  // Handle keyboard for help mode - press any key to exit
  useEffect(() => {
    if (!showHelp) return;

    const handleKeyPress = () => {
      setShowHelp(false);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showHelp]);

  // Handle visibility change - check immediately when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Don't fetch if watched repos haven't been loaded yet
        if (watchedReposRef.current.length === 0) {
          return;
        }

        const settings = getSettings();

        // Check if cache is expired
        const cached = loadPRCache(settings.cacheDuration);

        if (!cached || cached.length === 0) {
          // Cache expired or empty - fetch immediately
          fetchPRs(false);
          return;
        }

        // Cache is valid - check if polling interval has passed
        const timeSinceLastCheck = Date.now() - lastCheckRef.current;
        const intervalMs = settings.pollingInterval * 60 * 1000;
        const cacheMaxAge = settings.cacheDuration * 60 * 1000;


        // If it's been longer than interval AND cache is aging, check for updates (silent)
        if (timeSinceLastCheck >= intervalMs) {
          const cacheAgePercent = (timeSinceLastCheck / cacheMaxAge) * 100;

          if (cacheAgePercent > 50) {
            checkForUpdates();
          } else {
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // Empty dependency - stable handler

  // Filter and sort PRs (memoized for performance - only recomputes when dependencies change)
  // Must be declared here (after all hooks) to follow Rules of Hooks
  const sortedPRs = useMemo(() => {
    // Apply search filter
    let filtered = prs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = prs.filter(pr =>
        pr.title.toLowerCase().includes(term) ||
        pr.repository.toLowerCase().includes(term) ||
        pr.user.login.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(pr => pr.review_status === filterStatus);
    }

    // Apply "hide already approved" filter
    if (hideAlreadyApproved) {
      filtered = filtered.filter(pr => !pr.other_approvers || pr.other_approvers.length === 0);
    }

    // Apply sort
    return getSortedPRs(filtered);
  }, [prs, searchTerm, filterStatus, hideAlreadyApproved, sortField, sortDirection]);

  const checkForUpdates = async () => {
    // Use refs to get latest values
    const currentWatchedRepos = watchedReposRef.current;
    const currentPRs = prsRef.current;


    // Safety check: Don't check if no watched repos are configured
    if (currentWatchedRepos.length === 0) {
      return;
    }

    try {
      // Get credentials from browser storage
      const credentials = getCredentials();
      if (!credentials || !credentials.github_token) {
        return;
      }

      // Build API URL with watched repos from ref
      const apiUrl = currentWatchedRepos.length > 0
        ? `/api/v1/version-control/prs-stream?repos=${encodeURIComponent(JSON.stringify(currentWatchedRepos))}`
        : '/api/v1/version-control/prs-stream';

      const res = await apiGetStream(apiUrl, credentials);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const foundPRs: PullRequest[] = [];

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line === 'DONE') continue;

          try {
            const pr = JSON.parse(line);
            if (!pr.error) {
              foundPRs.push(pr);
            }
          } catch (parseError) {
            console.error('[PRQueue] Parse error:', parseError);
          }
        }
      }

      // Compare with current data (use ref for latest PRs)
      const oldChecksum = getCachedChecksum();
      const newChecksum = generateChecksum(foundPRs);

      if (oldChecksum && oldChecksum !== newChecksum) {
        // Detect what changed (compare with current PRs from ref)
        const newPRs = foundPRs.filter(pr => !currentPRs.some(old => old.number === pr.number && old.repository === pr.repository));
        const statusChanged = foundPRs.filter(pr => {
          const old = currentPRs.find(o => o.number === pr.number && o.repository === pr.repository);
          return old && old.review_status !== pr.review_status;
        });
        const ciChanged = foundPRs.filter(pr => {
          const old = currentPRs.find(o => o.number === pr.number && o.repository === pr.repository);
          return old && old.ci_status !== pr.ci_status;
        });

        const totalChanges = newPRs.length + statusChanged.length + ciChanged.length;
        if (totalChanges > 0) {
          let message = '';
          if (newPRs.length > 0) message += `${newPRs.length} new PR${newPRs.length > 1 ? 's' : ''}`;
          if (statusChanged.length > 0) {
            if (message) message += ', ';
            message += `${statusChanged.length} status change${statusChanged.length > 1 ? 's' : ''}`;
          }
          if (ciChanged.length > 0) {
            if (message) message += ', ';
            message += `${ciChanged.length} CI update${ciChanged.length > 1 ? 's' : ''}`;
          }

          showNotification(`${message} • ${formatDistanceToNow(new Date(), { addSuffix: true })}`);
        }
      }

      // Update cache and timestamp - only after successful check
      savePRCache(foundPRs);
      lastCheckRef.current = Date.now(); // Update AFTER successful check
      setCacheTimestamp(lastCheckRef.current);
      setStaleBannerDismissed(false); // Reset banner dismissal on successful update

      // Update state with new data if changes detected
      if (oldChecksum !== newChecksum) {
        setPRs(foundPRs);
      } else {
      }

    } catch (error) {
      console.error('[PRQueue] Update check failed:', error);
      // Don't update lastCheckRef on failure - will retry sooner
    }
  };

  const showNotification = (message: string) => {
    const settings = getSettings();

    // Clear existing timer
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);

    setNotification({ message, visible: true });

    // Auto-dismiss
    notificationTimerRef.current = setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, settings.notificationDuration * 1000);
  };

  const runStaleDetection = async (loadedPRs: PullRequest[]) => {
    const settings = getSettings();
    const staleSet = detectStalePRs(loadedPRs, settings.stalePrThresholdHours);
    setStalePRs(staleSet);

    const alreadyNotified = getNotifiedStalePRs();
    const newlyStale = [...staleSet].filter(n => !alreadyNotified.has(n));

    if (newlyStale.length > 0) {
      await notificationService.requestPermission();
      for (const prNumber of newlyStale) {
        const pr = loadedPRs.find(p => p.number === prNumber);
        if (pr) {
          await notificationService.showStalePRAlert(pr, settings.stalePrThresholdHours);
        }
      }
      const updated = new Set([...alreadyNotified, ...newlyStale]);
      saveNotifiedStalePRs(updated);
    }

    // Remove PRs that are no longer stale from the notified set
    const stillStaleNotified = new Set([...alreadyNotified].filter(n => staleSet.has(n)));
    saveNotifiedStalePRs(stillStaleNotified);
  };

  const handleRefresh = () => {
    // Dismiss notification
    setNotification({ message: '', visible: false });

    // Fetch fresh data
    fetchPRs(false);

    // Reset last check timestamp so countdown restarts
    lastCheckRef.current = Date.now();

  };

  // Calculate cache status - read directly from localStorage for accuracy across tab switches
  const getCacheStatus = () => {
    const settings = getSettings();
    const cacheMaxAge = settings.cacheDuration * 60 * 1000; // Convert to ms

    // Always read timestamp from cache
    let timestamp = 0;
    try {
      timestamp = getCachedTimestamp();
    } catch (error) {
      console.error('[PRQueue] Failed to read cache timestamp:', error);
    }

    // If no timestamp, cache hasn't been loaded yet
    if (timestamp === 0) {
      return {
        ageText: 'Not loaded',
        ageMinutes: 0,
        percentage: 0,
        colorClass: 'text-gray-500',
        isStale: false
      };
    }

    const cacheAge = Date.now() - timestamp;
    const cacheAgeMinutes = Math.floor(cacheAge / 60000);
    const cachePercentage = (cacheAge / cacheMaxAge) * 100;

    // Format "X min ago" or "X hours ago"
    let ageText = '';
    if (cacheAgeMinutes < 1) {
      ageText = 'just now';
    } else if (cacheAgeMinutes < 60) {
      ageText = `${cacheAgeMinutes} min ago`;
    } else {
      const hours = Math.floor(cacheAgeMinutes / 60);
      ageText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Determine color state
    let colorClass = 'text-gray-500'; // Fresh (0-50%)
    if (cachePercentage >= 80) {
      colorClass = 'text-red-600'; // Stale
    } else if (cachePercentage >= 50) {
      colorClass = 'text-amber-600'; // Aging
    }

    return {
      ageText,
      ageMinutes: cacheAgeMinutes,
      percentage: cachePercentage,
      colorClass,
      isStale: cachePercentage >= 90
    };
  };

  // Show skeleton loader when initially loading (no PRs yet)
  const showSkeletonLoader = (loading || streaming) && prs.length === 0;

  if (error) {
    return (
      <div className="space-y-2">
        <InfoBanner
          type="error"
          message={error}
          action={{
            label: 'Retry',
            onClick: () => fetchPRs()
          }}
        />
      </div>
    );
  }

  // Wait for client-side mount before checking credentials (avoid hydration mismatch)
  if (!mounted) {
    return null;
  }

  // Show first-time user setup if no credentials
  if (!credentialsConfigured) {
    return (
      <div className="space-y-2">
        <EmptyState
          icon="$"
          title="Welcome to Clearance"
          description="Let's get you set up to start reviewing pull requests"
          reasons={[
            'Configure GitHub token for API access',
            'Configure Azure OpenAI for AI-powered reviews',
            'Select repositories to watch'
          ]}
          action={{
            label: 'Configure Settings',
            onClick: () => router.push('/onboarding')
          }}
        />
      </div>
    );
  }

  // Show empty state if no watched repos
  if (watchedRepos.length === 0) {
    return (
      <div className="space-y-2">
        <EmptyState
          icon="$"
          title="No repositories configured"
          description="Select repositories you actively review to populate your queue"
          reasons={[
            'Credentials are configured ✓',
            'No repositories selected for watching'
          ]}
          action={{
            label: 'Select Repositories',
            onClick: () => router.push('/settings')
          }}
        />
      </div>
    );
  }

  // Show initial load button if no PRs and not loading
  if (prs.length === 0 && !loading && !streaming && !error) {
    return (
      <div className="space-y-2">
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Ready to review PRs?
          </h3>
          <p className="mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Load your review queue to see pull requests from your watched repositories
          </p>
          <button
            onClick={() => fetchPRs()}
            className="px-6 py-3 rounded font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: 'var(--text-primary)',
              color: 'var(--surface-base)',
              border: '1px solid var(--border-emphasis)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            Load Queue
          </button>
          <p className="text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
            Watching {watchedRepos.length} {watchedRepos.length === 1 ? 'repository' : 'repositories'}
          </p>
        </div>
      </div>
    );
  }

  // sortedPRs is calculated above (after all hooks, before any returns) to follow Rules of Hooks

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Section: Header + Filters */}
      <div style={{ flex: 'none' }} className="space-y-2">
        {/* Welcome Banner */}
        {showWelcomeBanner && (
        <div
          className="flex items-center justify-between px-3 py-2 text-xs font-mono border-b"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-standard)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            [i] pr review dashboard • risk scoring • ai-powered review missions • context-aware chat •{' '}
            <Link
              href="/help"
              className="hover:underline"
              style={{ color: 'var(--text-tertiary)' }}
            >
              help
            </Link>
          </span>
          <button
            onClick={dismissWelcomeBannerPermanently}
            className="hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Command Header with Flags */}
      {githubUsername && (
        <div className="space-y-1">
          {!showHelp ? (
            <div className="font-mono text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span>@{githubUsername} $ pr-queue --watching {watchedRepos.length}</span>
              <button
                onClick={() => setShowHelp(true)}
                className="hover:underline transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Show symbol legend"
              >
                [?]
              </button>
            </div>
          ) : (
            <div
              className="font-mono text-xs space-y-1 cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setShowHelp(false)}
              title="Click to exit help"
            >
              <div style={{ color: 'var(--text-primary)' }}>@{githubUsername} $ pr-queue --help</div>
              <div className="pl-4 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>[P8]</span>       priority flag:
                  <span style={{ color: 'var(--diff-deletion)' }}> 8-10</span>
                  <span style={{ color: 'var(--status-needs-review)' }}> 6-7</span>
                  <span style={{ color: 'var(--status-approved)' }}> 4-5</span>
                  <span style={{ color: 'var(--text-muted)' }}> 0-3</span>
                </div>
                <div><span style={{ color: 'var(--text-secondary)' }}>#N</span>         pull request number</div>
                <div><span style={{ color: 'var(--text-secondary)' }}>✓/∑</span>        resolved/total comments</div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>CI: </span>
                  <span style={{ color: 'var(--status-approved)' }}>✓</span>
                  <span style={{ color: 'var(--diff-deletion)' }}>✗</span>
                  <span style={{ color: 'var(--status-needs-review)' }}>●</span>
                  <span style={{ color: 'var(--text-muted)' }}>−</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>   pass, fail, pending, none</span>
                </div>
                <div><span style={{ color: 'var(--text-secondary)' }}>✓ user</span>     approved by</div>
                <div><span style={{ color: 'var(--text-secondary)' }}>●</span>          status indicator</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>press any key or click to exit...</div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            <span>
              {sortedPRs.length} results
              {cacheTimestamp > 0 && (() => {
                const ageMinutes = Math.floor((Date.now() - cacheTimestamp) / 60000);
                const ageText = ageMinutes < 1 ? 'just now' : ageMinutes === 1 ? '1m ago' : `${ageMinutes}m ago`;
                return <> • updated {ageText}</>;
              })()}
            </span>
            <button
              onClick={handleRefresh}
              className="hover:underline transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              [refresh]
            </button>
          </div>
          <div
            className="w-full h-px"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />
        </div>
      )}

      {/* Stale Data Warning (only if stale) */}
      {prs.length > 0 && (() => {
        const status = getCacheStatus();
        const showStaleBanner = status.isStale && !staleBannerDismissed;

        if (showStaleBanner) {
          return (
            <div className="flex items-center justify-between px-3 py-2 text-xs font-mono border-b" style={{
              color: '#dc2626',
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--surface-base)'
            }}>
              <span>
                [!] stale data ({status.ageText}) •{' '}
                <button
                  onClick={handleRefresh}
                  className="hover:underline"
                  style={{ color: 'inherit' }}
                >
                  refresh
                </button>
              </span>
              <button
                onClick={() => setStaleBannerDismissed(true)}
                className="hover:opacity-70"
                style={{ color: 'inherit' }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Inline Notification */}
      {notification.visible && (
        <div
          className="flex items-center justify-between px-3 py-2 text-xs font-mono border-b"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}
        >
          <span>[i] {notification.message}</span>
          <button
            onClick={handleRefresh}
            className="hover:underline transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            [refresh]
          </button>
        </div>
      )}

      {streaming && prs.length > 0 && (
        <div className="px-3 py-2 text-xs font-mono border-b flex items-center gap-2" style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--status-needs-review)'
        }}>
          <span>[●]</span>
          streaming... ({prs.length} found)
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap text-xs">
        <input
          type="text"
          placeholder="search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[240px] px-2 py-1.5 rounded font-mono transition-colors"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-standard)',
            color: 'var(--text-primary)'
          }}
        />
        <div className="flex gap-1.5">
          {(['all', 'awaiting_review', 'approved_by_me', 'merged'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className="px-2 py-1.5 rounded font-mono transition-all"
              style={{
                backgroundColor: filterStatus === status ? 'var(--surface-raised)' : 'transparent',
                border: `1px solid ${filterStatus === status ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
                color: filterStatus === status ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {status === 'all' ? 'all' : getStatusLabel(status).toLowerCase()}
            </button>
          ))}

          {/* Hide Already Approved Toggle */}
          <label
            className="flex items-center gap-1.5 px-2 py-1.5 rounded font-mono transition-all cursor-pointer"
            style={{
              backgroundColor: hideAlreadyApproved ? 'var(--surface-raised)' : 'transparent',
              border: `1px solid ${hideAlreadyApproved ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
              color: hideAlreadyApproved ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={hideAlreadyApproved}
              onChange={(e) => setHideAlreadyApproved(e.target.checked)}
              className="cursor-pointer"
            />
            <span>hide approved</span>
          </label>
        </div>
      </div>
      </div>

      {/* Stale PRs banner — shown when every open PR is stale */}
      {stalePRs.size > 0 && prs.filter(p => p.review_status !== 'merged').length === stalePRs.size && (
        <InfoBanner
          type="warning"
          message={`${stalePRs.size} PR${stalePRs.size !== 1 ? 's have' : ' has'} had no activity for more than ${getSettings().stalePrThresholdHours}h`}
        />
      )}

      {/* Empty State or PR List */}
      {sortedPRs.length === 0 && prs.length > 0 ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', marginTop: '8px' }}>
          <EmptyState
            icon="∅"
            title="No PRs match your criteria"
            reasons={[
              searchTerm ? `Search: "${searchTerm}"` : 'No search filter',
              filterStatus !== 'all' ? `Status filter: ${filterStatus.replace('_', ' ')}` : 'No status filter',
              hideAlreadyApproved ? 'Hiding already approved PRs' : 'Showing all PRs'
            ]}
            action={{
              label: 'Clear Filters',
              onClick: () => {
                setSearchTerm('');
                setFilterStatus('all');
                setHideAlreadyApproved(false);
              }
            }}
          />
        </div>
      ) : sortedPRs.length > 0 ? (
        <div className="rounded border" style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-standard)',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginTop: '8px'
        }}>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium border-b" style={{
            color: 'var(--text-tertiary)',
            borderColor: 'var(--border-subtle)',
            flex: 'none'
          }}>
            <button
              onClick={() => handleSort('priority')}
              className="col-span-1 text-left flex items-center hover:text-primary transition-colors"
              style={{ color: sortField === 'priority' ? 'var(--text-primary)' : 'inherit' }}
            >
              Priority
              <SortIndicator field="priority" />
            </button>
            <div className="col-span-3">PR</div>
            <button
              onClick={() => handleSort('repository')}
              className="col-span-2 text-left flex items-center hover:text-primary transition-colors"
              style={{ color: sortField === 'repository' ? 'var(--text-primary)' : 'inherit' }}
            >
              Repository
              <SortIndicator field="repository" />
            </button>
            <button
              onClick={() => handleSort('author')}
              className="col-span-2 text-left flex items-center hover:text-primary transition-colors"
              style={{ color: sortField === 'author' ? 'var(--text-primary)' : 'inherit' }}
            >
              Author
              <SortIndicator field="author" />
            </button>
            <div className="col-span-1">Comments [✓/∑]</div>
            <div className="col-span-1 text-center">[✓]</div>
            <button
              onClick={() => handleSort('age')}
              className="col-span-1 text-left flex items-center hover:text-primary transition-colors"
              style={{ color: sortField === 'age' ? 'var(--text-primary)' : 'inherit' }}
            >
              Age
              <SortIndicator field="age" />
            </button>
            <div className="col-span-1">Status</div>
          </div>

          {/* Table Body - Scrollable */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {showSkeletonLoader ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </>
            ) : (
              sortedPRs.map((pr) => {
                const isMerged = pr.review_status === 'merged';
                const hasOtherApprovers = pr.other_approvers && pr.other_approvers.length > 0;
                const incompleteTasks = taskCounts.get(`${pr.number}:${pr.repository}`) || 0;
                const rowOpacity = isMerged ? 0.6 : hasOtherApprovers ? 0.6 : 1;
                const priority = calculatePriorityScore(pr);
                const priorityColor = getPriorityColor(priority);
                const priorityOpacity = getPriorityOpacity(priority);

                return (
                  <div
                    key={`${pr.repository}-${pr.number}`}
                    onClick={() => handleRowClick(pr, sortedPRs)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 border-b ${isMerged ? '' : 'pr-row'}`}
                    style={{
                      borderColor: 'var(--border-subtle)',
                      borderLeftColor: getStatusColor(pr.review_status),
                      borderLeftWidth: '3px',
                      cursor: isMerged ? 'not-allowed' : 'pointer',
                      opacity: rowOpacity
                    }}
                  >
                    {/* Priority Flag */}
                    <div className="col-span-1 flex items-center">
                      <span
                        className="font-mono text-xs"
                        style={{
                          color: priorityColor,
                          opacity: priorityOpacity
                        }}
                        title={`Priority: ${priority.toFixed(1)}/10 (${priority >= 8 ? 'Critical' : priority >= 6 ? 'High' : priority >= 4 ? 'Medium' : 'Low'})`}
                      >
                        [P{Math.round(priority)}]
                      </span>
                    </div>

                    {/* PR Title */}
                    <div className="col-span-3 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {pr.review_status === 'awaiting_review' ? (
                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs hover:underline transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                            title="Open on GitHub"
                          >
                            #{pr.number}
                          </a>
                        ) : (
                          <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            #{pr.number}
                          </span>
                        )}
                        {stalePRs.has(pr.number) && (
                          <span
                            className="font-mono text-xs px-1 rounded"
                            style={{
                              color: '#f59e0b',
                              border: '1px solid #f59e0b',
                              opacity: 0.85,
                            }}
                            title="No activity above stale threshold"
                          >
                            ⏱ stale
                          </span>
                        )}
                        <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {pr.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Branch info */}
                        {pr.head?.ref && pr.base?.ref && (
                          <div className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span>{pr.head.ref}</span>
                            <span>→</span>
                            <span>{pr.base.ref}</span>
                          </div>
                        )}
                        {/* Show approvers for all PRs (including merged) */}
                        {hasOtherApprovers && (
                          <div className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span>✓</span>
                            <span>
                              {pr.other_approvers!.length === 1
                                ? `${pr.other_approvers![0]}`
                                : `${pr.other_approvers!.length} approvals`}
                            </span>
                          </div>
                        )}
                        {(() => {
                          const taskCount = incompleteTasks;
                          return taskCount ? (
                            <div
                              className="flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-xs"
                              style={{
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                textDecoration: isMerged ? 'line-through' : 'none'
                              }}
                              title={`${taskCount} incomplete task${taskCount !== 1 ? 's' : ''}`}
                            >
                              {taskCount} task{taskCount !== 1 ? 's' : ''}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Repository */}
                    <div className="col-span-2 flex items-center min-w-0">
                      <span className="font-mono text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                        {pr.repository.split('/').pop()}
                      </span>
                    </div>

                    {/* Author */}
                    <div className="col-span-2 flex items-center min-w-0">
                      <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        @{pr.user.login}
                      </span>
                    </div>

                    {/* Comments */}
                    <div className="col-span-1 flex items-center">
                      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pr.comments ? `${pr.comments.resolved}/${pr.comments.total}` : '−'}
                      </span>
                    </div>

                    {/* CI Status */}
                    <div className="col-span-1 flex items-center justify-center">
                      {(() => {
                        const ciStatus = getCIStatusIcon(pr.ci_status);
                        return (
                          <span
                            className="font-mono text-sm ci-status-icon"
                            style={{ color: ciStatus.color }}
                            title={ciStatus.label}
                          >
                            {ciStatus.icon}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Age */}
                    <div className="col-span-1 flex items-center">
                      <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {formatDistanceToNow(new Date(pr.created_at), { addSuffix: false }).replace('about ', '')}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex items-center">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(pr.review_status) }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
