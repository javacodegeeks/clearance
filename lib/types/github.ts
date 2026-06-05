export interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  repository: string;
  additions: number;
  deletions: number;
  changed_files: number;
  state: string;
  review_status?: 'awaiting_review' | 'approved_by_me' | 'merged';
  merged?: boolean;
  other_approvers?: string[]; // Approvers other than current user
  comments?: {
    total: number;
    resolved: number;
  };
  ci_status?: 'success' | 'failure' | 'pending' | 'none';
  risk_score?: number;
  risk_breakdown?: {
    impact: number;
    likelihood: number;
    factors: {
      impact: string[];
      likelihood: string[];
    };
    recommendations: string[];
  };
  head?: {
    ref: string; // Source branch name
  };
  base?: {
    ref: string; // Target branch name
  };
}

// AI-Led Review Mission Types
export interface Mission {
  id: string;                    // Unique identifier
  priority: 'high' | 'medium' | 'low';
  category: 'security' | 'pattern' | 'edge-case' | 'performance' | 'correctness';
  file: string;                  // File path
  line?: number;                 // Line number (optional)
  title: string;                 // Short summary
  why: string;                   // Explanation (1-2 sentences)
  tasks: string[];               // Specific checks to perform
  status: 'pending' | 'complete' | 'skipped';
  code_snippet?: string;         // Optional code context
}

export interface MissionCacheEntry {
  pr_number: number;
  repository: string;
  missions: Mission[];
  generated_at: number;          // timestamp
  pr_updated_at: string;         // PR last update to invalidate cache
}

// GitHub PR File Types
export interface GitHubPRFile {
  filename: string;
  patch?: string;
  status: string;
  additions?: number;
  deletions?: number;
  changes?: number;
}

// Comment Thread Types
export interface CommentUser {
  login: string;
  avatar_url: string;
}

export interface Comment {
  id: number;
  body: string;
  user: CommentUser;
  created_at: string;
  updated_at: string;
  path?: string;
  line?: number;
  in_reply_to_id?: number;
  html_url: string;
}

export interface CommentThread {
  id: number;
  root: Comment;
  replies: Comment[];
  resolved: boolean;
  path?: string;
  line?: number;
}

export interface CommentStats {
  total: number;
  resolved: number;
  unresolved: number;
}
