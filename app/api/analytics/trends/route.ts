import { NextResponse } from 'next/server';
import { PullRequest } from '@/lib/types/github';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prs: allPRs, days } = body as { prs: PullRequest[]; days: number };

    if (!allPRs || allPRs.length === 0) {
      return NextResponse.json({
        reviewTimes: [],
        prVolume: [],
        reviewerActivity: [],
      });
    }

    // Filter to only PRs approved by user or merged (where user approved)
    // and within the time range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const approvedPRs = allPRs.filter(pr => {
      // Only include PRs where user approved or merged
      const isApproved = pr.review_status === 'approved_by_me' || pr.review_status === 'merged';

      // Check if within date range
      // For merged PRs, use merged_at date; for approved PRs, use updated_at
      const dateToCheck = (pr.review_status === 'merged' && pr.merged_at)
        ? pr.merged_at
        : pr.updated_at;
      const prDate = new Date(dateToCheck);
      const isInRange = prDate >= cutoffDate;

      return isApproved && isInRange;
    });

    // Separate approved vs merged
    const onlyApproved = approvedPRs.filter(pr => pr.review_status === 'approved_by_me');
    const merged = approvedPRs.filter(pr => pr.review_status === 'merged');

    // Generate all dates in range
    const allDates: Array<{ date: string; approved: number; merged: number }> = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      allDates.push({
        date: date.toISOString().split('T')[0],
        approved: 0,
        merged: 0
      });
    }

    // Count approvals per day (using updated_at as proxy for approval date)
    const dateApprovedMap = new Map<string, number>();
    onlyApproved.forEach(pr => {
      const date = new Date(pr.updated_at).toISOString().split('T')[0];
      dateApprovedMap.set(date, (dateApprovedMap.get(date) || 0) + 1);
    });

    // Count merged per day (using merged_at for accurate merge date)
    const dateMergedMap = new Map<string, number>();
    merged.forEach(pr => {
      const dateToUse = pr.merged_at || pr.updated_at;
      const date = new Date(dateToUse).toISOString().split('T')[0];
      dateMergedMap.set(date, (dateMergedMap.get(date) || 0) + 1);
    });

    // Merge counts with all dates
    allDates.forEach(d => {
      if (dateApprovedMap.has(d.date)) {
        d.approved = dateApprovedMap.get(d.date)!;
      }
      if (dateMergedMap.has(d.date)) {
        d.merged = dateMergedMap.get(d.date)!;
      }
    });

    // Count approvals per repository (with breakdown)
    const repoApprovedMap = new Map<string, number>();
    const repoMergedMap = new Map<string, number>();

    onlyApproved.forEach(pr => {
      repoApprovedMap.set(pr.repository, (repoApprovedMap.get(pr.repository) || 0) + 1);
    });

    merged.forEach(pr => {
      repoMergedMap.set(pr.repository, (repoMergedMap.get(pr.repository) || 0) + 1);
    });

    // Combine and sort repositories by total count
    const allRepos = new Set([...repoApprovedMap.keys(), ...repoMergedMap.keys()]);
    const reviewerActivity = Array.from(allRepos)
      .map(repo => ({
        reviewer: repo,
        reviews: (repoApprovedMap.get(repo) || 0) + (repoMergedMap.get(repo) || 0),
        approved: repoApprovedMap.get(repo) || 0,
        merged: repoMergedMap.get(repo) || 0,
        avgTime: 0,
      }))
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, 10); // Top 10

    const trendsData = {
      reviewTimes: allDates.map(item => ({
        date: item.date,
        avgTime: item.approved + item.merged, // Total for compatibility
        approved: item.approved,
        merged: item.merged,
      })),
      prVolume: allDates.map(item => ({
        date: item.date,
        opened: 0,
        merged: item.merged,
        closed: item.approved,
      })),
      reviewerActivity,
      summary: {
        totalApproved: onlyApproved.length,
        totalMerged: merged.length,
        total: approvedPRs.length,
      }
    };

    return NextResponse.json(trendsData);
  } catch (error) {
    console.error('[API] Error fetching trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends data' },
      { status: 500 }
    );
  }
}
