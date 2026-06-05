'use client';

import { useState, useRef } from 'react';
import { resetWelcomeBanner } from '@/lib/storage/welcome-banner-storage';

export default function HelpPage() {
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  const sections = [
    { id: 'risk-scoring', label: 'risk scoring' },
    { id: 'pr-details', label: 'pr details & reviewd ai' },
    { id: 'autonomous-analysis', label: 'autonomous analysis' },
    { id: 'status-indicators', label: 'status indicators' },
    { id: 'cache-polling', label: 'cache & polling' },
    { id: 'trends', label: 'trends & analytics' },
    { id: 'about', label: 'about' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      isProgrammaticScroll.current = true;

      // Use scrollIntoView for reliable scrolling
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Set focused section for spotlight effect
      setFocusedSection(id);

      // Clear the programmatic scroll flag after animation completes
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 1000);
    }
  };


  return (
    <main className="container mx-auto h-full px-6 py-6 flex flex-col">
      {/* Fixed Header */}
      <div style={{ flex: 'none' }}>
        <h1 className="font-mono text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          $ help
        </h1>
        <p className="mb-4 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          commands • features • troubleshooting
        </p>
      </div>

      {/* Scrollable Content */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div className="flex gap-8">
          {/* Sticky TOC - Desktop only */}
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <nav className="sticky top-8">
              <div className="font-mono text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
                contents
              </div>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className="text-left text-sm font-mono transition-colors w-full hover:opacity-80"
                      style={{
                        color: 'var(--text-secondary)',
                        paddingLeft: '12px',
                      }}
                    >
                      {section.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 max-w-[700px] space-y-6">
            {/* Risk Scoring */}
            <section
              id="risk-scoring"
              className="space-y-3 pt-4 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'risk-scoring' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                risk scoring
              </h2>

              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <div>
                  <div className="font-mono text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                    Formula: Risk Score = √(Impact × Likelihood)
                  </div>
                  <p>
                    Each PR is scored from 0-10 based on how risky it is to merge. Higher scores mean higher risk.
                  </p>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    impact (1-10): how bad if this breaks?
                  </div>
                  <ul className="space-y-1 ml-6" style={{ listStyleType: 'disc' }}>
                    <li>Size of change (lines added/deleted)</li>
                    <li>Number of files modified</li>
                    <li>CI status (failing checks = higher impact)</li>
                  </ul>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    likelihood (1-10): how likely to break?
                  </div>
                  <ul className="space-y-1 ml-6" style={{ listStyleType: 'disc' }}>
                    <li>CI health (failing/pending/success)</li>
                    <li>Code complexity (large changes)</li>
                    <li>Review depth (comments, discussion)</li>
                    <li>Timing (Friday after 3pm = higher risk)</li>
                    <li>Unresolved review comments</li>
                  </ul>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="font-mono font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    risk levels
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-1 rounded" style={{
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                      }}>
                        0-3.9
                      </span>
                      <div>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>low risk</span>
                        <span className="mx-2">—</span>
                        <span>small change, tests passing, well reviewed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-1 rounded" style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e'
                      }}>
                        4-6.9
                      </span>
                      <div>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>medium risk</span>
                        <span className="mx-2">—</span>
                        <span>large change, some test failures</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-1 rounded" style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b'
                      }}>
                        7-10
                      </span>
                      <div>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>high risk</span>
                        <span className="mx-2">—</span>
                        <span>major refactor, no tests, friday 4pm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* PR Details & reviewd AI */}
            <section
              id="pr-details"
              className="space-y-3 pt-4 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'pr-details' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                pr details & reviewd ai
              </h2>

              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>
                  When you click a PR from the queue, the details page opens with a three-column workspace optimized for focused review.
                </p>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    workspace layout
                  </div>
                  <div className="font-mono text-xs mb-2 px-3 py-2 rounded" style={{
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-primary)'
                  }}>
                    Files/Commits/Checks/Tasks (35%) | Risk/Missions (25%) | reviewd Chat (40%)
                  </div>
                  <ul className="space-y-1 ml-6" style={{ listStyleType: 'disc' }}>
                    <li>Left column — File changes with diff view, commit history, CI check results, and review tasks</li>
                    <li>Middle column — Autonomous Agent Orchestrator (pinned at top), then Risk Assessment, Review Missions, and Code Governance panels</li>
                    <li>Right column — reviewd AI chat, always visible for context-aware queries</li>
                  </ul>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    risk assessment
                  </div>
                  <p>
                    Automatically generated by the autonomous agent when PR loads. Click <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>[+]</code> to expand. Shows risk score breakdown with impact and likelihood factors, plus recommendations for safe merging. Expanding Risk Assessment automatically collapses Review Missions.
                  </p>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    review missions
                  </div>
                  <p>
                    Automatically generated by the autonomous agent when PR loads. Analyzes changed files and creates priority-ranked review tasks. Open by default when missions exist.
                  </p>
                  <ul className="space-y-1 ml-6 mt-2" style={{ listStyleType: 'disc' }}>
                    <li>Mission cards — Show file, line number, category, and suggested action</li>
                    <li>Jump to file — Click to navigate directly to the code in the Files tab</li>
                    <li>Ask AI — Query reviewd about specific mission context</li>
                    <li>Mark complete — Track progress through review checklist</li>
                  </ul>
                  <p className="mt-2">
                    Missions are ranked by priority. High priority items show count at the top in red.
                  </p>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    code governance
                  </div>
                  <p>
                    Automatically fetched by the autonomous agent if SonarQube is configured in settings. Shows code quality violations found in the PR with severity breakdown. If SonarQube is not configured, this panel is hidden.
                  </p>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    reviewd ai chat
                  </div>
                  <p>
                    Context-aware chat interface with full PR context. Knows PR title, description, file changes, and previous conversation history.
                  </p>
                  <ul className="space-y-1 ml-6 mt-2" style={{ listStyleType: 'disc' }}>
                    <li>Query syntax — Type in <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>$ query...</code> input, Enter to send, Shift+Enter for new line</li>
                    <li>Message headers — Terminal-style: <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>$ you@pr-1234</code> for user, <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>&gt; reviewd [✓ 2.1s]</code> for AI responses</li>
                    <li>Streaming — Real-time response with character count: <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>[●] streaming... 245 chars</code></li>
                    <li>Persistence — Conversation saved in browser (IndexedDB), persists across page loads</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Autonomous Analysis */}
            <section
              id="autonomous-analysis"
              className="space-y-3 pt-4 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'autonomous-analysis' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                autonomous analysis
              </h2>

              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>
                  When you open a PR, an autonomous agent analyzes the changes and generates three types of analysis in parallel: risk assessment, review missions, and code governance.
                </p>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    agent orchestrator
                  </div>
                  <p>
                    The orchestrator appears at the top of the middle column, showing real-time analysis progress. It stays pinned while you scroll through panels below.
                  </p>
                  <ul className="space-y-1 ml-6 mt-2" style={{ listStyleType: 'disc' }}>
                    <li>Auto-starts when PR loads — analyzes files and decides priority order</li>
                    <li>Parallel execution — runs all three analyses simultaneously for speed</li>
                    <li>Intelligent prioritization — security files → governance first, large changes → risk first, new files → missions first</li>
                    <li>Status indicators — <span style={{ color: '#4ade80' }}>[●]</span> active, <span style={{ color: '#6b7280' }}>[✓]</span> complete with timing</li>
                    <li>Expandable — click <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>[+]</code> to see agent reasoning and task details</li>
                  </ul>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    three analysis tasks
                  </div>
                  <div className="space-y-2 ml-6">
                    <div>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>risk-assessment</span>
                      <span className="mx-2">—</span>
                      <span>Calculates risk score, identifies impact factors, provides merge recommendations</span>
                    </div>
                    <div>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>review-focus</span>
                      <span className="mx-2">—</span>
                      <span>Generates priority-ranked review missions with file locations and suggested actions</span>
                    </div>
                    <div>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>code-governance</span>
                      <span className="mx-2">—</span>
                      <span>Fetches SonarQube violations if configured, shows code quality issues in PR</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    agent observatory
                  </div>
                  <p>
                    Click <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>[obs]</code> in the orchestrator header to open the observability drawer. Provides deep visibility into agent execution.
                  </p>
                  <ul className="space-y-1 ml-6 mt-2" style={{ listStyleType: 'disc' }}>
                    <li><span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>[live]</span> — Real-time execution timeline showing tool invocations and decision points with timing</li>
                    <li><span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>[tools]</span> — Full request/response inspection for each API call with input/output JSON</li>
                    <li><span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>[metrics]</span> — Performance profiling with parallel efficiency calculation and bottleneck analysis</li>
                  </ul>
                  <p className="mt-2">
                    The drawer slides in from the right without blocking the dashboard. Click × or toggle <code style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '13px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-primary)'
                    }}>[obs]</code> again to close.
                  </p>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    agent reasoning
                  </div>
                  <p>
                    The orchestrator shows why it chose a specific priority order. Expand to see reasoning like:
                  </p>
                  <div className="font-mono text-xs mt-2 px-3 py-2 rounded space-y-1" style={{
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-tertiary)'
                  }}>
                    <div>security-related changes detected</div>
                    <div>prioritizing code governance</div>
                  </div>
                  <p className="mt-2">
                    or for large changes:
                  </p>
                  <div className="font-mono text-xs mt-2 px-3 py-2 rounded space-y-1" style={{
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-tertiary)'
                  }}>
                    <div>450 lines changed</div>
                    <div>prioritizing risk analysis</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Status Indicators */}
            <section
              id="status-indicators"
              className="space-y-3 pt-4 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'status-indicators' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                status indicators
              </h2>

              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: 'var(--status-needs-review)' }} />
                  <div>
                    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>needs review</span>
                    <span className="mx-2">—</span>
                    <span>awaiting your review</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: 'var(--status-approved)' }} />
                  <div>
                    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>approved</span>
                    <span className="mx-2">—</span>
                    <span>you approved this pr</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: 'var(--status-merged)' }} />
                  <div>
                    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>merged</span>
                    <span className="mx-2">—</span>
                    <span>historical record (no action needed)</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Cache & Polling */}
            <section
              id="cache-polling"
              className="space-y-3 pt-4 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'cache-polling' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                cache & polling
              </h2>

              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <ul className="space-y-2 ml-6" style={{ listStyleType: 'disc' }}>
                  <li>data cached for 60 minutes (configurable in settings)</li>
                  <li>background check every 30 minutes (configurable in settings)</li>
                  <li>notifications appear for new prs, status changes, ci updates</li>
                  <li>manual refresh — system notifies, you decide when to update</li>
                  <li>cache status line shows data age and remaining time</li>
                  <li>stale data banner appears when cache is 90% expired</li>
                </ul>
              </div>
            </section>

            {/* Trends */}
            <section
              id="trends"
              className="space-y-3 pt-4 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'trends' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                trends & analytics
              </h2>

              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>
                  The Trends page shows analytics based on PRs you approved or merged. Data is calculated from your cached PR list.
                </p>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    metrics shown
                  </div>
                  <ul className="space-y-1 ml-6" style={{ listStyleType: 'disc' }}>
                    <li>daily activity — timeline chart showing approved and merged prs over time</li>
                    <li>approval volume — stacked bar chart showing daily approval counts</li>
                    <li>repository breakdown — table showing approvals by repository with counts</li>
                  </ul>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    time ranges
                  </div>
                  <p>
                    filter by 7, 30, or 90 days. charts and stats update based on selected range.
                  </p>
                </div>

                <div>
                  <div className="font-mono font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    data source
                  </div>
                  <p>
                    trends are calculated from your local pr cache, not live github data. refresh the queue page to update cached data before viewing trends.
                  </p>
                </div>
              </div>
            </section>

            {/* About */}
            <section
              id="about"
              className="space-y-3 pt-4 pb-6 transition-opacity duration-500"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                opacity: focusedSection && focusedSection !== 'about' ? 0.3 : 1
              }}
            >
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                about
              </h2>

              <div className="text-sm space-y-3" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>
                  this dashboard helps engineering teams manage pr review queues efficiently. built with focus on signal over noise, control over automation, and transparency in risk assessment.
                </p>

                <div>
                  <button
                    onClick={() => {
                      resetWelcomeBanner();
                      window.location.href = '/';
                    }}
                    className="font-mono text-xs px-3 py-2 border rounded hover:bg-surface-raised transition-colors"
                    style={{
                      borderColor: 'var(--border-standard)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    show welcome banner again
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
