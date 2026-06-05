// Shared comment and thread resolution utilities

export function groupCommentsIntoThreads(reviewComments: any[]): Map<string, any[]> {
  const threads = new Map<string, any[]>();

  reviewComments.forEach((comment: any) => {
    const threadId = comment.in_reply_to_id || comment.id;
    if (!threads.has(threadId.toString())) {
      threads.set(threadId.toString(), []);
    }
    threads.get(threadId.toString())!.push(comment);
  });

  return threads;
}

export function isThreadResolvedByKeywords(thread: any[]): boolean {
  if (thread.length === 0) return false;

  const lastComment = thread[thread.length - 1];
  if (!lastComment.body) return false;

  const body = lastComment.body.toLowerCase();
  return body.includes('resolved') ||
         body.includes('fixed') ||
         body.includes('done');
}

export function isThreadResolvedByReplies(thread: any[]): boolean {
  return thread.length > 1;
}

export function calculateCommentStats(
  reviewComments: any[],
  issueComments: any[],
  method: 'keywords' | 'replies' = 'keywords'
): { total: number; resolved: number } {
  const threads = groupCommentsIntoThreads(reviewComments);
  const resolutionCheck = method === 'keywords'
    ? isThreadResolvedByKeywords
    : isThreadResolvedByReplies;

  let resolvedCount = 0;
  threads.forEach((thread) => {
    if (resolutionCheck(thread)) {
      resolvedCount++;
    }
  });

  return {
    total: method === 'keywords'
      ? reviewComments.length + issueComments.length
      : threads.size + issueComments.length,
    resolved: resolvedCount,
  };
}

export function calculateCommentStatsWithKeywords(
  reviewComments: any[],
  issueComments: any[]
): { total: number; resolved: number } {
  return calculateCommentStats(reviewComments, issueComments, 'keywords');
}

export function calculateCommentStatsWithReplies(
  reviewComments: any[],
  issueComments: any[]
): { total: number; resolved: number } {
  return calculateCommentStats(reviewComments, issueComments, 'replies');
}
