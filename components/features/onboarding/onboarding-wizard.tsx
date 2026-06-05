'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCredentials, getCredentials } from '@/lib/storage/credentials-storage';
import { saveWatchedRepos } from '@/lib/storage/watched-repos-client';
import { apiGet } from '@/lib/utils/api-client';
import SectionHeader from '@/components/ui/section-header';
import ValidationMessage from '@/components/ui/validation-message';
import InfoBanner from '@/components/ui/info-banner';

interface Repository {
  full_name: string;
  description: string | null;
  private: boolean;
  updated_at: string;
}

type Step = 1 | 2 | 3;

export default function OnboardingWizard() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');

  // Step 2
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState('');
  const [searchRepo, setSearchRepo] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);

  // Step 3
  const [completing, setCompleting] = useState(false);

  const validateToken = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setTokenError('GitHub token is required');
      return;
    }
    setValidating(true);
    setTokenError('');

    try {
      const fakeCredentials = {
        github_token: trimmed,
        azure_openai_endpoint: '',
        azure_openai_key: '',
        azure_openai_deployment: '',
        azure_openai_api_version: '',
        sonarqube_url: '',
        sonarqube_token: '',
      };
      await apiGet<Repository[]>('/api/v1/version-control/repos', fakeCredentials);
      saveCredentials(fakeCredentials);
      setTokenValid(true);
    } catch {
      setTokenError('Token invalid or lacks repo scope. Check token permissions and try again.');
    } finally {
      setValidating(false);
    }
  };

  const loadRepos = async () => {
    setLoadingRepos(true);
    setReposError('');
    try {
      const creds = getCredentials();
      if (!creds) throw new Error('No credentials');
      const fetched = await apiGet<Repository[]>('/api/v1/version-control/repos', creds);
      setRepos(fetched);
    } catch {
      setReposError('Failed to load repositories. Check your connection and try again.');
    } finally {
      setLoadingRepos(false);
    }
  };

  const goToStep2 = async () => {
    setStep(2);
    await loadRepos();
  };

  const toggleRepo = (fullName: string) => {
    setSelectedRepos(prev =>
      prev.includes(fullName) ? prev.filter(r => r !== fullName) : [...prev, fullName]
    );
  };

  const completeOnboarding = () => {
    setCompleting(true);
    saveWatchedRepos(selectedRepos);
    localStorage.setItem('onboardingCompleted', 'true');
    router.push('/');
  };

  const filteredRepos = repos.filter(r =>
    r.full_name.toLowerCase().includes(searchRepo.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Step indicators */}
      <div className="flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {([1, 2, 3] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span>──</span>}
            <span
              className="px-2 py-0.5 rounded"
              style={{
                backgroundColor: step === s ? 'var(--surface-raised)' : 'transparent',
                border: `1px solid ${step === s ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
                color: step > s ? 'var(--status-approved)' : step === s ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {step > s ? '✓' : s === 1 ? 'github token' : s === 2 ? 'repositories' : 'done'}
            </span>
          </span>
        ))}
      </div>

      {/* ── Step 1: GitHub Token ── */}
      {step === 1 && (
        <div className="space-y-4">
          <SectionHeader
            stepNumber={1}
            title="github token"
            description="Personal access token with repo scope"
            isComplete={tokenValid}
            isRequired={true}
          />

          <div className="space-y-2">
            <label htmlFor="github-token" className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              GitHub Personal Access Token
            </label>
            <input
              id="github-token"
              type="password"
              value={token}
              onChange={e => {
                setToken(e.target.value);
                setTokenError('');
                setTokenValid(false);
              }}
              placeholder="ghp_..."
              autoComplete="off"
              className="w-full px-3 py-2 rounded text-sm font-mono"
              style={{
                backgroundColor: 'var(--surface-base)',
                border: `1px solid ${tokenError ? 'var(--diff-deletion)' : tokenValid ? 'var(--status-approved)' : 'var(--border-standard)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {tokenError && <ValidationMessage message={tokenError} />}
            {tokenValid && (
              <p className="text-xs font-mono" style={{ color: 'var(--status-approved)' }}>
                ✓ Token validated
              </p>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <span />
            {!tokenValid ? (
              <button
                onClick={validateToken}
                disabled={validating || !token.trim()}
                className="px-4 py-2 rounded font-mono text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--surface-base)',
                  opacity: validating || !token.trim() ? 0.5 : 1,
                  cursor: validating || !token.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {validating ? 'validating...' : 'Validate Token'}
              </button>
            ) : (
              <button
                onClick={goToStep2}
                className="px-4 py-2 rounded font-mono text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--surface-base)',
                }}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Repository Selection ── */}
      {step === 2 && (
        <div className="space-y-4">
          <SectionHeader
            stepNumber={2}
            title="repositories"
            description="Select repos to watch in your PR queue"
            isComplete={selectedRepos.length > 0}
            isRequired={true}
          />

          {loadingRepos ? (
            <div className="text-sm font-mono py-4" style={{ color: 'var(--text-secondary)' }}>
              loading repos...
            </div>
          ) : reposError ? (
            <InfoBanner
              type="error"
              message={reposError}
              action={{ label: 'retry', onClick: loadRepos }}
            />
          ) : (
            <>
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchRepo}
                onChange={e => setSearchRepo(e.target.value)}
                className="w-full px-3 py-1.5 rounded text-sm"
                style={{
                  backgroundColor: 'var(--surface-base)',
                  border: '1px solid var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
              />

              <div
                className="border rounded overflow-y-auto"
                style={{
                  maxHeight: '280px',
                  backgroundColor: 'var(--surface-base)',
                  borderColor: 'var(--border-standard)',
                }}
              >
                {filteredRepos.length === 0 ? (
                  <div className="px-4 py-6 text-sm font-mono text-center" style={{ color: 'var(--text-muted)' }}>
                    no repositories found
                  </div>
                ) : (
                  filteredRepos.map(repo => (
                    <label
                      key={repo.full_name}
                      className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRepos.includes(repo.full_name)}
                        onChange={() => toggleRepo(repo.full_name)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                          {repo.full_name}
                        </div>
                        {repo.description && (
                          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>

              <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {selectedRepos.length} selected
              </p>
            </>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded font-mono text-sm"
              style={{
                border: '1px solid var(--border-standard)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedRepos.length === 0}
              className="px-4 py-2 rounded font-mono text-sm"
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--surface-base)',
                opacity: selectedRepos.length === 0 ? 0.5 : 1,
                cursor: selectedRepos.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <div className="space-y-4">
          <SectionHeader
            stepNumber={3}
            title="all set"
            description="Your PR queue is ready"
            isComplete={true}
            isRequired={false}
          />

          <div className="space-y-2 font-mono text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
            <div style={{ color: 'var(--status-approved)' }}>✓ GitHub token configured</div>
            <div style={{ color: 'var(--status-approved)' }}>
              ✓ {selectedRepos.length} {selectedRepos.length === 1 ? 'repository' : 'repositories'} selected
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            You can configure Azure OpenAI and SonarQube credentials any time in Settings.
          </p>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded font-mono text-sm"
              style={{
                border: '1px solid var(--border-standard)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
              }}
            >
              ← Back
            </button>
            <button
              onClick={completeOnboarding}
              disabled={completing}
              className="px-4 py-2 rounded font-mono text-sm"
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--surface-base)',
                opacity: completing ? 0.5 : 1,
                cursor: completing ? 'not-allowed' : 'pointer',
              }}
            >
              {completing ? 'loading...' : 'Open PR Queue →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
