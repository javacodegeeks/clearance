'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings, saveSettings, AppSettings } from '@/lib/config/settings';
import { getWatchedRepos, saveWatchedRepos } from '@/lib/storage/watched-repos-client';
import { clearPRCache } from '@/lib/features/trends/pr-cache';
import { getCredentials, saveCredentials, clearCredentials, type Credentials } from '@/lib/storage/credentials-storage';
import { clearAllConversations } from '@/lib/storage/indexeddb-storage';
import { apiGet } from '@/lib/utils/api-client';
import { getProactiveSettings, saveProactiveSettings, type ProactiveSettings } from '@/lib/config/proactive-settings';
import SectionHeader from '@/components/ui/section-header';
import ValidationMessage from '@/components/ui/validation-message';

interface Repository {
  full_name: string;
  description: string | null;
  private: boolean;
  updated_at: string;
}

export default function SettingsForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    github_token: '',
    azure_openai_endpoint: '',
    azure_openai_key: '',
    azure_openai_deployment: '',
    azure_openai_api_version: '',
    sonarqube_url: '',
    sonarqube_token: '',
  });
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettings>(getProactiveSettings());
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [watchedRepos, setWatchedRepos] = useState<string[]>([]);
  const [initialWatchedRepos, setInitialWatchedRepos] = useState<string[]>([]);
  const [initialFormData, setInitialFormData] = useState({
    github_token: '',
    azure_openai_endpoint: '',
    azure_openai_key: '',
    azure_openai_deployment: '',
    azure_openai_api_version: '',
    sonarqube_url: '',
    sonarqube_token: '',
  });
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState('');
  const [searchRepo, setSearchRepo] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'updated'>('name-asc');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // Load API credentials from browser localStorage
    const credentials = getCredentials();
    if (credentials) {
      setFormData({
        ...credentials,
        sonarqube_url: credentials.sonarqube_url || '',
        sonarqube_token: credentials.sonarqube_token || '',
      });
      setInitialFormData({
        ...credentials,
        sonarqube_url: credentials.sonarqube_url || '',
        sonarqube_token: credentials.sonarqube_token || '',
      }); // Track initial API credentials for comparison
    }
    setLoading(false);

    // Load app preferences from localStorage
    const savedSettings = getSettings();
    setAppSettings(savedSettings);

    // Load watched repos from database (async)
    getWatchedRepos().then(watched => {
      setWatchedRepos(watched);
      setInitialWatchedRepos(watched); // Track initial state for comparison on save
    });
  }, []);

  // Sync watched repos from database whenever page becomes visible
  // Note: We only sync watchedRepos, not initialWatchedRepos - that stays as the baseline from first mount
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getWatchedRepos().then(watched => {
          setWatchedRepos(watched);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  /* // Debug: Log whenever watchedRepos changes
  useEffect(() => {
  }, [watchedRepos]); */

  // Log when repositories load with current watched state
  /* useEffect(() => {
    if (repositories.length > 0) {
    }
  }, [repositories, watchedRepos]); */

  const fetchRepositories = async () => {
    // Validate GitHub token before making request
    if (!formData.github_token || !formData.github_token.trim()) {
      setReposError('Please enter your GitHub token first before loading repositories.');
      return;
    }

    setLoadingRepos(true);
    setReposError('');

    try {
      const repos = await apiGet<Repository[]>('/api/v1/version-control/repos', formData);
      setRepositories(repos);
    } catch (err) {
      console.error('[SettingsForm] Error fetching repos:', err);
      setReposError(err instanceof Error ? err.message : 'Failed to fetch repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Validation helpers
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // GitHub token is required
    if (!formData.github_token?.trim()) {
      errors.github_token = 'GitHub token is required';
    }

    // Azure OpenAI is optional, but if any field is filled, all must be filled
    const azureFields = [
      { key: 'azure_openai_endpoint', label: 'Azure OpenAI endpoint' },
      { key: 'azure_openai_key', label: 'Azure OpenAI key' },
      { key: 'azure_openai_deployment', label: 'Deployment name' },
      { key: 'azure_openai_api_version', label: 'API version' },
    ];

    const filledAzureFields = azureFields.filter(f => formData[f.key as keyof typeof formData]?.trim());
    const hasAnyAzureField = filledAzureFields.length > 0;
    const hasAllAzureFields = filledAzureFields.length === azureFields.length;

    if (hasAnyAzureField && !hasAllAzureFields) {
      // Some but not all Azure fields are filled - show errors for empty ones
      azureFields.forEach(f => {
        if (!formData[f.key as keyof typeof formData]?.trim()) {
          errors[f.key] = `${f.label} is required when configuring Azure OpenAI`;
        }
      });
    }

    // At least one repository is required
    if (watchedRepos.length === 0) {
      errors.watched_repos = 'Select at least 1 repository';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    const hasGitHub = !!formData.github_token?.trim();
    const hasRepos = watchedRepos.length > 0;

    // Check Azure: either all fields filled or all empty
    const azureEndpoint = formData.azure_openai_endpoint?.trim();
    const azureKey = formData.azure_openai_key?.trim();
    const azureDeployment = formData.azure_openai_deployment?.trim();
    const azureVersion = formData.azure_openai_api_version?.trim();

    const azureFieldsFilled = [azureEndpoint, azureKey, azureDeployment, azureVersion].filter(Boolean).length;
    const azureValid = azureFieldsFilled === 0 || azureFieldsFilled === 4;

    return hasGitHub && hasRepos && azureValid;
  };

  // Check completion status for credentials section
  const isCredentialsComplete = (): boolean => {
    // Section is complete if GitHub token is filled (minimum viable)
    return !!formData.github_token?.trim();
  };

  const isReposComplete = (): boolean => {
    return watchedRepos.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (saving) {
      return;
    }

    // Validate all fields
    if (!validateForm()) {
      setError('Please fix the validation errors above');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);
    setValidationErrors({});

    try {
      // Save API credentials to browser localStorage
      const success = saveCredentials(formData as Credentials);

      if (!success) {
        throw new Error('Failed to save credentials');
      }

      // 1. Check if API credentials changed (affects GitHub/Azure access)
      const apiCredsChanged =
        formData.github_token !== initialFormData.github_token ||
        formData.azure_openai_endpoint !== initialFormData.azure_openai_endpoint ||
        formData.azure_openai_key !== initialFormData.azure_openai_key ||
        formData.azure_openai_deployment !== initialFormData.azure_openai_deployment ||
        formData.azure_openai_api_version !== initialFormData.azure_openai_api_version;


      // 2. Check if watched repos actually changed from initial load
      const initialSorted = [...initialWatchedRepos].sort().join(',');
      const currentSorted = [...watchedRepos].sort().join(',');
      const watchedReposChanged = initialSorted !== currentSorted;


      // 3. Clear cache if API credentials OR watched repos changed
      if (apiCredsChanged || watchedReposChanged) {
        clearPRCache();
      }

      // 4. Save app preferences to localStorage (no cache clear needed for UI settings)
      saveSettings(appSettings);

      // 5. Save proactive settings to localStorage
      saveProactiveSettings(proactiveSettings);

      // 6. Watched repos are already saved on toggle, but ensure final state is saved
      saveWatchedRepos(watchedRepos);

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      console.error('[SettingsForm] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleRepo = (repoFullName: string) => {
    setWatchedRepos(prev => {
      const updated = prev.includes(repoFullName)
        ? prev.filter(r => r !== repoFullName)
        : [...prev, repoFullName];

      // Save to localStorage immediately to prevent loss on tab switch
      saveWatchedRepos(updated);

      return updated;
    });
  };

  const handleRefreshRepos = () => {
    setRepositories([]);
    setReposError('');
    fetchRepositories();
  };

  const handleCancelRepoSelection = () => {
    setRepositories([]);
    setReposError('');
    setSearchRepo('');
  };

  const getSortedRepos = () => {
    let sorted = [...repositories];

    // Filter by search
    if (searchRepo) {
      sorted = sorted.filter(repo =>
        repo.full_name.toLowerCase().includes(searchRepo.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.full_name.localeCompare(a.full_name));
        break;
      case 'updated':
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
    }

    return sorted;
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    setError('');

    try {
      // Clear credentials
      clearCredentials();

      // Clear watched repos
      saveWatchedRepos([]);

      // Reset app settings to defaults
      const defaultSettings = getSettings();
      saveSettings(defaultSettings);

      // Clear PR cache
      clearPRCache();

      // Clear review standards (custom items and dismissals)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('review-standards-state');
        localStorage.removeItem('quick-review-dismissals');
        localStorage.removeItem('welcome-banner-dismissed');
      }

      // Clear IndexedDB data (conversations, tasks, missions)
      await clearAllConversations();

      // Reset form state
      setFormData({
        github_token: '',
        azure_openai_endpoint: '',
        azure_openai_key: '',
        azure_openai_deployment: '',
        azure_openai_api_version: '',
        sonarqube_url: '',
        sonarqube_token: '',
      });
      setAppSettings(defaultSettings);
      setWatchedRepos([]);
      setInitialWatchedRepos([]);
      setInitialFormData({
        github_token: '',
        azure_openai_endpoint: '',
        azure_openai_key: '',
        azure_openai_deployment: '',
        azure_openai_api_version: '',
        sonarqube_url: '',
        sonarqube_token: '',
      });
      setRepositories([]);
      setShowResetConfirm(false);

      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('[SettingsForm] Reset error:', err);
      setError('Failed to reset settings');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Credentials Section */}
      <div className="space-y-3">
        <SectionHeader
          stepNumber={1}
          title="credentials"
          description="github token required • azure openai optional"
          isComplete={isCredentialsComplete()}
          isRequired={true}
        />

        <div>
          <label htmlFor="github_token" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            id="github_token"
            value={formData.github_token}
            onChange={e => {
              setFormData({ ...formData, github_token: e.target.value });
              if (validationErrors.github_token) {
                setValidationErrors({ ...validationErrors, github_token: '' });
              }
            }}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: `1px solid ${validationErrors.github_token ? 'var(--diff-deletion)' : 'var(--border-standard)'}`,
              color: 'var(--text-primary)',
            }}
          />
          {validationErrors.github_token ? (
            <ValidationMessage message={validationErrors.github_token} />
          ) : (
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Needs <code>repo</code> scope to read PRs
            </p>
          )}
        </div>

        {/* Azure OpenAI Section - Optional */}
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            <strong>Azure OpenAI (Optional)</strong> — Configure these fields to enable AI-powered PR analysis and chat features. You can skip this and configure later.
          </p>
        </div>

        <div>
          <label htmlFor="azure_openai_endpoint" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Azure OpenAI Endpoint
          </label>
          <input
            type="url"
            id="azure_openai_endpoint"
            value={formData.azure_openai_endpoint}
            onChange={e => {
              setFormData({ ...formData, azure_openai_endpoint: e.target.value });
              if (validationErrors.azure_openai_endpoint) {
                setValidationErrors({ ...validationErrors, azure_openai_endpoint: '' });
              }
            }}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: `1px solid ${validationErrors.azure_openai_endpoint ? 'var(--diff-deletion)' : 'var(--border-standard)'}`,
              color: 'var(--text-primary)',
            }}
            placeholder="https://your-resource.openai.azure.com"
          />
          {validationErrors.azure_openai_endpoint && (
            <ValidationMessage message={validationErrors.azure_openai_endpoint} />
          )}
        </div>

        <div>
          <label htmlFor="azure_openai_key" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Azure OpenAI API Key
          </label>
          <input
            type="password"
            id="azure_openai_key"
            value={formData.azure_openai_key}
            onChange={e => {
              setFormData({ ...formData, azure_openai_key: e.target.value });
              if (validationErrors.azure_openai_key) {
                setValidationErrors({ ...validationErrors, azure_openai_key: '' });
              }
            }}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: `1px solid ${validationErrors.azure_openai_key ? 'var(--diff-deletion)' : 'var(--border-standard)'}`,
              color: 'var(--text-primary)',
            }}
          />
          {validationErrors.azure_openai_key && (
            <ValidationMessage message={validationErrors.azure_openai_key} />
          )}
        </div>

        <div>
          <label htmlFor="azure_openai_deployment" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Azure OpenAI Deployment Name
          </label>
          <input
            type="text"
            id="azure_openai_deployment"
            value={formData.azure_openai_deployment}
            onChange={e => {
              setFormData({ ...formData, azure_openai_deployment: e.target.value });
              if (validationErrors.azure_openai_deployment) {
                setValidationErrors({ ...validationErrors, azure_openai_deployment: '' });
              }
            }}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: `1px solid ${validationErrors.azure_openai_deployment ? 'var(--diff-deletion)' : 'var(--border-standard)'}`,
              color: 'var(--text-primary)',
            }}
            placeholder="gpt-4"
          />
          {validationErrors.azure_openai_deployment && (
            <ValidationMessage message={validationErrors.azure_openai_deployment} />
          )}
        </div>

        <div>
          <label htmlFor="azure_openai_api_version" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Azure OpenAI API Version
          </label>
          <input
            type="text"
            id="azure_openai_api_version"
            value={formData.azure_openai_api_version}
            onChange={e => {
              setFormData({ ...formData, azure_openai_api_version: e.target.value });
              if (validationErrors.azure_openai_api_version) {
                setValidationErrors({ ...validationErrors, azure_openai_api_version: '' });
              }
            }}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: `1px solid ${validationErrors.azure_openai_api_version ? 'var(--diff-deletion)' : 'var(--border-standard)'}`,
              color: 'var(--text-primary)',
            }}
            placeholder="2024-02-15-preview"
          />
          {validationErrors.azure_openai_api_version ? (
            <ValidationMessage message={validationErrors.azure_openai_api_version} />
          ) : (
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Common versions: 2024-02-15-preview, 2023-12-01-preview, 2023-05-15
            </p>
          )}
        </div>
      </div>

      {/* Watched Repositories Section */}
      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-standard)' }}>
        <SectionHeader
          stepNumber={2}
          title="repositories"
          description="select repos to watch"
          isComplete={isReposComplete()}
          isRequired={true}
        />
        {validationErrors.watched_repos && (
          <ValidationMessage message={validationErrors.watched_repos} />
        )}

        {repositories.length === 0 && !loadingRepos && !reposError ? (
          <div>
            {/* Show currently selected repos */}
            {watchedRepos.length > 0 && (
              <div className="mb-3 p-3 rounded border" style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border-standard)'
              }}>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Currently Watching ({watchedRepos.length})
                </div>
                <ul className="space-y-1">
                  {watchedRepos.map(repo => (
                    <li key={repo} className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      • {repo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-center py-6">
              <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>
                {!formData.github_token
                  ? 'Enter your GitHub token above, then load repositories'
                  : watchedRepos.length > 0
                    ? 'Load repositories to modify your selection'
                    : 'Click below to load your repositories'}
              </p>
              <button
                type="button"
                onClick={fetchRepositories}
                disabled={!formData.github_token || !formData.github_token.trim()}
                className="px-3 py-1.5 border rounded font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--border-standard)',
                  color: (!formData.github_token || !formData.github_token.trim())
                    ? 'var(--text-muted)'
                    : 'var(--text-primary)',
                  backgroundColor: 'transparent',
                }}
              >
                load repos
              </button>
            </div>
          </div>
        ) : loadingRepos ? (
          <div className="text-center py-8 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
            loading repos...
          </div>
        ) : reposError ? (
          <div className="p-3 rounded border text-sm" style={{
            backgroundColor: '#fee2e2',
            borderColor: 'var(--diff-deletion)',
            color: '#991b1b'
          }}>
            {reposError}
            <button
              type="button"
              onClick={fetchRepositories}
              className="ml-2 font-mono underline"
            >
              retry
            </button>
          </div>
        ) : repositories.length > 0 ? (
          <>
            {/* Search, Sort, and Refresh */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchRepo}
                onChange={e => setSearchRepo(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded text-sm"
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
              />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 rounded text-sm"
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="updated">Recently Updated</option>
              </select>
              <button
                type="button"
                onClick={handleRefreshRepos}
                disabled={loadingRepos}
                className="px-3 py-1.5 border rounded font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--border-standard)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'transparent',
                }}
              >
                {loadingRepos ? 'refreshing...' : 'refresh'}
              </button>
              <button
                type="button"
                onClick={handleCancelRepoSelection}
                disabled={loadingRepos}
                className="px-3 py-1.5 border rounded font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--border-standard)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                cancel
              </button>
            </div>

            {/* Selected Count */}
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Selected: {watchedRepos.length} {watchedRepos.length === 1 ? 'repository' : 'repositories'}
            </div>

            {/* Repository List */}
            <div
              className="border rounded overflow-y-auto"
              style={{
                maxHeight: '300px',
                backgroundColor: 'var(--surface-base)',
                borderColor: 'var(--border-standard)',
              }}
            >
              {getSortedRepos().map(repo => {
                const isChecked = watchedRepos.includes(repo.full_name);
                return (
                  <label
                    key={`${repo.full_name}-${isChecked}`}
                    className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer hover:bg-surface-raised transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRepo(repo.full_name)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                        {repo.full_name}
                      </div>
                      {repo.description && (
                        <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {repo.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* App Preferences Section */}
      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-standard)' }}>
        <SectionHeader
          stepNumber={3}
          title="preferences"
          description="cache • polling • notifications"
          isComplete={true}
          isRequired={false}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="cacheDuration" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Cache Duration (min)
            </label>
            <input
              type="number"
              id="cacheDuration"
              min="1"
              max="1440"
              value={appSettings.cacheDuration}
              onChange={e => setAppSettings({ ...appSettings, cacheDuration: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-1.5 rounded text-sm"
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-standard)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              1-1440 minutes
            </p>
          </div>

          <div>
            <label htmlFor="pollingInterval" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Polling Interval (min)
            </label>
            <input
              type="number"
              id="pollingInterval"
              min="5"
              max="120"
              value={appSettings.pollingInterval}
              onChange={e => setAppSettings({ ...appSettings, pollingInterval: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-1.5 rounded text-sm"
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-standard)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              5-120 minutes
            </p>
          </div>

          <div>
            <label htmlFor="notificationDuration" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Notification (sec)
            </label>
            <input
              type="number"
              id="notificationDuration"
              min="5"
              max="60"
              value={appSettings.notificationDuration}
              onChange={e => setAppSettings({ ...appSettings, notificationDuration: parseInt(e.target.value) || 20 })}
              className="w-full px-3 py-1.5 rounded text-sm"
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-standard)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              5-60 seconds
            </p>
          </div>

          <div>
            <label htmlFor="stalePrThresholdHours" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Stale PR Threshold (h)
            </label>
            <input
              type="number"
              id="stalePrThresholdHours"
              min="1"
              max="720"
              value={appSettings.stalePrThresholdHours}
              onChange={e => setAppSettings({ ...appSettings, stalePrThresholdHours: Math.max(1, parseInt(e.target.value) || 24) })}
              className="w-full px-3 py-1.5 rounded text-sm"
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-standard)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              1-720 hours (default 24)
            </p>
          </div>
        </div>
      </div>

      {/* Proactive Analysis Section */}
      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-standard)' }}>
        <SectionHeader
          stepNumber={4}
          title="proactive analysis"
          description="auto-generate missions on queue load"
          isComplete={true}
          isRequired={false}
        />

        <div className="space-y-4">
          {/* Auto-Generation */}
          <div className="space-y-3">
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Automatically generate review missions for PRs that meet risk or complexity thresholds when you load the PR queue page.
            </p>

            <div className="space-y-3 pl-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proactiveSettings.autoGeneration.enabled}
                  onChange={e => setProactiveSettings({
                    ...proactiveSettings,
                    autoGeneration: { ...proactiveSettings.autoGeneration, enabled: e.target.checked }
                  })}
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Enable automatic mission generation in PR queue
                </span>
              </label>

              <div>
                <label htmlFor="riskThreshold" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Risk Threshold
                </label>
                <input
                  type="number"
                  id="riskThreshold"
                  min="0"
                  max="10"
                  step="0.1"
                  value={proactiveSettings.autoGeneration.riskThreshold}
                  onChange={e => setProactiveSettings({
                    ...proactiveSettings,
                    autoGeneration: { ...proactiveSettings.autoGeneration, riskThreshold: parseFloat(e.target.value) || 6.0 }
                  })}
                  className="w-full px-3 py-1.5 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-standard)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  PRs with risk score &gt;= this value will be automatically analyzed
                </p>
              </div>

              <div>
                <label htmlFor="fileThreshold" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  File Change Threshold
                </label>
                <input
                  type="number"
                  id="fileThreshold"
                  min="1"
                  max="1000"
                  value={proactiveSettings.autoGeneration.fileThreshold}
                  onChange={e => setProactiveSettings({
                    ...proactiveSettings,
                    autoGeneration: { ...proactiveSettings.autoGeneration, fileThreshold: parseInt(e.target.value) || 10 }
                  })}
                  className="w-full px-3 py-1.5 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    border: '1px solid var(--border-standard)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  PRs with &gt;= this many changed files will be automatically analyzed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Governance Section */}
      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-standard)' }}>
        <SectionHeader
          stepNumber={5}
          title="code governance"
          description="sonarqube integration"
          isComplete={!!formData.sonarqube_url && !!formData.sonarqube_token}
          isRequired={false}
        />

        <div className="space-y-4">
          {/* SonarQube Credentials */}
          <div className="space-y-3">
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              <strong>SonarQube (Optional)</strong> — Configure to enable code quality analysis via the autonomous agent. When configured, violations are automatically fetched when you open a PR.
            </p>

            <div>
              <label htmlFor="sonarqube_url" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                SonarQube URL
              </label>
              <input
                type="url"
                id="sonarqube_url"
                value={formData.sonarqube_url}
                onChange={e => setFormData({ ...formData, sonarqube_url: e.target.value })}
                className="w-full px-3 py-1.5 rounded text-sm"
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
                placeholder="https://sonarqube.example.com"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Your SonarQube server URL
              </p>
            </div>

            <div>
              <label htmlFor="sonarqube_token" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                SonarQube User Token
              </label>
              <input
                type="password"
                id="sonarqube_token"
                value={formData.sonarqube_token}
                onChange={e => setFormData({ ...formData, sonarqube_token: e.target.value })}
                className="w-full px-3 py-1.5 rounded text-sm"
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                User token with project read permissions
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border text-sm" style={{
          backgroundColor: '#fee2e2',
          borderColor: 'var(--diff-deletion)',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded border text-sm" style={{
          backgroundColor: '#d1fae5',
          borderColor: 'var(--status-approved)',
          color: '#065f46'
        }}>
          Settings saved! Redirecting to dashboard...
        </div>
      )}

      {resetSuccess && (
        <div className="p-3 rounded border text-sm font-mono" style={{
          backgroundColor: '#d1fae5',
          borderColor: 'var(--status-approved)',
          color: '#065f46'
        }}>
          [✓] all settings cleared
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {/* Reset Button - Left Side */}
        <div>
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="font-mono text-xs px-3 py-1.5 border rounded hover:bg-surface-raised transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--border-standard)',
                color: 'var(--text-tertiary)',
              }}
            >
              [reset]
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                clear all settings? cannot undo.
              </span>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting}
                className="font-mono text-xs px-3 py-1.5 border rounded hover:bg-surface-raised transition-colors disabled:opacity-50"
                style={{
                  borderColor: 'var(--diff-deletion)',
                  color: 'var(--diff-deletion)',
                }}
              >
                {resetting ? 'resetting...' : 'confirm-reset'}
              </button>
              <button
                type="button"
                onClick={handleCancelReset}
                disabled={resetting}
                className="font-mono text-xs px-2 py-1 hover:underline transition-colors disabled:opacity-50"
                style={{
                  color: 'var(--text-tertiary)',
                }}
              >
                cancel
              </button>
            </div>
          )}
        </div>

        {/* Save Button - Right Side */}
        <button
          type="submit"
          disabled={saving || !isFormValid()}
          className="px-3 py-1.5 border rounded font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: 'var(--border-standard)',
            color: (saving || !isFormValid()) ? 'var(--text-muted)' : 'var(--text-primary)',
            backgroundColor: 'transparent',
          }}
        >
          {saving ? 'saving...' : 'save'}
        </button>
      </div>
    </form>
  );
}
