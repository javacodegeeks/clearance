import { getMockFileBadges } from '@/lib/mock-data/intelligence-features';
import { useEffect } from 'react';

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  url: string;
}

interface FilesTabContentProps {
  files: FileChange[];
  targetFile?: string | null; // File to scroll to and expand
  expandedDirs: Set<string>;
  expandedFiles: Set<string>;
  onExpandedDirsChange: (dirs: Set<string>) => void;
  onExpandedFilesChange: (files: Set<string>) => void;
  prNumber?: number; // For mock badge generation
}

export default function FilesTabContent({
  files,
  targetFile,
  expandedDirs,
  expandedFiles,
  onExpandedDirsChange,
  onExpandedFilesChange,
  prNumber = 0,
}: FilesTabContentProps) {

  // Handle targetFile - expand directory and scroll to file
  useEffect(() => {
    if (targetFile) {
      // Get the directory for this file
      const parts = targetFile.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';

      // Expand the directory
      onExpandedDirsChange(new Set(expandedDirs).add(dir));

      // Expand only this file (accordion pattern)
      onExpandedFilesChange(new Set([targetFile]));

      // Scroll to file after a short delay
      setTimeout(() => {
        const fileElement = document.querySelector(`[data-filename="${targetFile}"]`);
        if (fileElement) {
          fileElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [targetFile]);

  const toggleDirectory = (dir: string) => {
    const next = new Set(expandedDirs);
    if (next.has(dir)) {
      next.delete(dir);
    } else {
      next.add(dir);
    }
    onExpandedDirsChange(next);
  };

  const toggleFile = (filename: string) => {
    // If clicking the same file, collapse it
    if (expandedFiles.has(filename)) {
      onExpandedFilesChange(new Set());
    } else {
      // Otherwise, collapse all and open only this file (accordion pattern)
      onExpandedFilesChange(new Set([filename]));
    }
  };

  // Group files by directory
  const groupedFiles: { [key: string]: FileChange[] } = {};
  files.forEach(file => {
    const parts = file.filename.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
    if (!groupedFiles[dir]) {
      groupedFiles[dir] = [];
    }
    groupedFiles[dir].push(file);
  });

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'added': return '[A]';
      case 'removed': return '[D]';
      case 'modified': return '[M]';
      case 'renamed': return '[R]';
      default: return '[M]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'added': return 'var(--diff-addition)';
      case 'removed': return 'var(--diff-deletion)';
      case 'modified': return 'var(--status-needs-review)';
      case 'renamed': return 'var(--text-secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const sortedDirs = Object.keys(groupedFiles).sort();

  return (
    <div className="font-mono text-sm" style={{
      overflowY: 'auto',
      maxHeight: '70vh',
    }}>
      {sortedDirs.map((dir, dirIndex) => {
        const dirFiles = groupedFiles[dir];
        const isExpanded = expandedDirs.has(dir);
        const isLastDir = dirIndex === sortedDirs.length - 1;

        return (
          <div key={dir}>
            {/* Directory Header */}
            <button
              onClick={() => toggleDirectory(dir)}
              className="w-full text-left py-2 px-3 hover:bg-surface-raised transition-colors flex items-center gap-2"
            >
              <span style={{ color: 'var(--text-tertiary)' }}>
                {isLastDir ? '└──' : '├──'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {dir === '/' ? 'root' : dir}/
              </span>
              <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">
                {dirFiles.length} {dirFiles.length === 1 ? 'file' : 'files'}
              </span>
              <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>

            {/* Files in Directory */}
            {isExpanded && (
              <div>
                {dirFiles.map((file, fileIndex) => {
                  const fileName = file.filename.split('/').pop() || file.filename;
                  const isLastFile = fileIndex === dirFiles.length - 1;
                  const isFileExpanded = expandedFiles.has(file.filename);
                  const badges = getMockFileBadges(file.filename, prNumber);

                  const getBadgeColor = (badge: string) => {
                    switch (badge) {
                      case 'CRITICAL': return { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626' };
                      case 'PATTERN': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
                      case 'N+1': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
                      default: return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' };
                    }
                  };

                  return (
                    <div key={file.filename} data-filename={file.filename}>
                      {/* File Row */}
                      {file.patch ? (
                        <button
                          onClick={() => toggleFile(file.filename)}
                          className="w-full text-left py-2 px-3 hover:bg-surface-raised transition-colors flex items-center gap-2"
                        >
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {isLastDir ? '    ' : '│   '}
                            {isLastFile ? '└──' : '├──'}
                          </span>
                          <span style={{ color: getStatusColor(file.status) }} className="text-xs">
                            {getStatusLabel(file.status)}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {fileName}
                          </span>
                          {badges.length > 0 && (
                            <div className="flex items-center gap-1">
                              {badges.map((badge, badgeIdx) => {
                                const colors = getBadgeColor(badge);
                                return (
                                  <span
                                    key={badgeIdx}
                                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                    }}
                                  >
                                    [{badge}]
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <span style={{ color: 'var(--diff-addition)' }} className="text-xs ml-auto">
                            +{file.additions}
                          </span>
                          <span style={{ color: 'var(--diff-deletion)' }} className="text-xs">
                            −{file.deletions}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">
                            {isFileExpanded ? '[−]' : '[+]'}
                          </span>
                        </button>
                      ) : (
                        <div className="w-full py-2 px-3 flex items-center gap-2">
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {isLastDir ? '    ' : '│   '}
                            {isLastFile ? '└──' : '├──'}
                          </span>
                          <span style={{ color: getStatusColor(file.status) }} className="text-xs">
                            {getStatusLabel(file.status)}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {fileName}
                          </span>
                          {badges.length > 0 && (
                            <div className="flex items-center gap-1">
                              {badges.map((badge, badgeIdx) => {
                                const colors = getBadgeColor(badge);
                                return (
                                  <span
                                    key={badgeIdx}
                                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                    }}
                                  >
                                    [{badge}]
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <span style={{ color: 'var(--diff-addition)' }} className="text-xs ml-auto">
                            +{file.additions}
                          </span>
                          <span style={{ color: 'var(--diff-deletion)' }} className="text-xs">
                            −{file.deletions}
                          </span>
                        </div>
                      )}

                      {/* Expanded Diff */}
                      {isFileExpanded && file.patch && (
                        <div
                          className="py-2 px-3 ml-12 border-l custom-scrollbar text-xs"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            backgroundColor: 'var(--surface-raised)',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            overflowX: 'auto',
                          }}
                        >
                          <pre style={{ color: 'var(--text-secondary)' }}>{file.patch}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
