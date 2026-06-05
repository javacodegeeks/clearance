"use client";

import { getCredentials } from "@/lib/storage/credentials-storage";
import { loadPRCache } from "@/lib/features/trends/pr-cache";
import { apiPost } from "@/lib/utils/api-client";
import { SkeletonLoader } from "@/components/ui";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendsData {
  reviewTimes: Array<{ date: string; avgTime: number; approved?: number; merged?: number }>;
  prVolume: Array<{ date: string; opened: number; merged: number; closed: number }>;
  reviewerActivity: Array<{ reviewer: string; reviews: number; approved?: number; merged?: number; avgTime: number }>;
  summary?: {
    totalApproved: number;
    totalMerged: number;
    total: number;
  };
}

export default function TrendsDashboard() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true);
      try {
        const credentials = getCredentials();
        if (!credentials) {
          console.log("[Trends] No credentials - visit settings to configure GitHub access");
          setData({
            reviewTimes: [],
            prVolume: [],
            reviewerActivity: [],
          });
          return;
        }

        // Load PRs from client-side cache
        const cachedPRs = loadPRCache(10000); // Load all cached PRs

        if (!cachedPRs || cachedPRs.length === 0) {
          console.log("[Trends] No PRs in cache - visit queue page first");
          setData({
            reviewTimes: [],
            prVolume: [],
            reviewerActivity: [],
          });
          return;
        }

        // Send cached PRs to API for processing
        const trendsData = await apiPost<TrendsData>(
          `/api/v1/analytics/trends`,
          {
            prs: cachedPRs,
            days: parseInt(timeRange),
          },
          credentials
        );
        setData(trendsData);
      } catch (error) {
        console.error("Failed to fetch trends:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [timeRange]);

  const SkeletonChart = () => (
    <div className="rounded border p-6" style={{
      backgroundColor: 'var(--surface-elevated)',
      borderColor: 'var(--border-standard)'
    }}>
      <SkeletonLoader width="w-48" height="h-5" className="mb-6" />
      <SkeletonLoader width="w-full" height="h-[300px]" />
    </div>
  );

  return (
    <main className="container mx-auto h-full overflow-y-auto px-6 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            $ trends
          </h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded text-sm font-mono transition-colors"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-standard)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="7">last 7 days</option>
            <option value="30">last 30 days</option>
            <option value="90">last 90 days</option>
          </select>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Activity Over Time */}
          {loading ? (
            <SkeletonChart />
          ) : data ? (
            <div className="rounded border p-6" style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border-standard)'
            }}>
              <h2 className="font-mono text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                daily approval activity
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.reviewTimes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-tertiary)"
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="var(--text-tertiary)"
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-raised)',
                      border: '1px solid var(--border-standard)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="var(--status-approved)"
                    strokeWidth={2}
                    name="approved"
                    dot={{ fill: 'var(--status-approved)', r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="merged"
                    stroke="var(--status-merged)"
                    strokeWidth={2}
                    name="merged"
                    dot={{ fill: 'var(--status-merged)', r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {/* PR Volume */}
          {loading ? (
            <SkeletonChart />
          ) : data ? (
            <div className="rounded border p-6" style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border-standard)'
            }}>
              <h2 className="font-mono text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                approval volume
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.prVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-tertiary)"
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="var(--text-tertiary)"
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-raised)',
                      border: '1px solid var(--border-standard)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="closed"
                    stackId="a"
                    fill="var(--status-approved)"
                    name="approved"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="merged"
                    stackId="a"
                    fill="var(--status-merged)"
                    name="merged"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>

        {/* Repository Activity Table */}
        {loading ? (
          <div className="rounded border p-6" style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-standard)'
          }}>
            <SkeletonLoader width="w-48" height="h-5" className="mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonLoader width="w-48" height="h-4" />
                  <SkeletonLoader width="w-12" height="h-4" />
                </div>
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="rounded border" style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-standard)'
          }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                approvals by repository
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs font-mono font-medium" style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-tertiary)'
                  }}>
                    <th className="text-left px-6 py-3">repository</th>
                    <th className="text-right px-6 py-3">approved</th>
                    <th className="text-right px-6 py-3">merged</th>
                    <th className="text-right px-6 py-3">total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reviewerActivity.length > 0 ? (
                    data.reviewerActivity.map((item) => (
                      <tr
                        key={item.reviewer}
                        className="border-b"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <td className="px-6 py-3 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {item.reviewer.split('/').pop()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-sm" style={{ color: 'var(--status-approved)' }}>
                          {item.approved || 0}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-sm" style={{ color: 'var(--status-merged)' }}>
                          {item.merged || 0}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {item.reviews}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                        no data available. visit queue page to load prs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded border p-6 text-center font-mono" style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-standard)',
            color: 'var(--text-secondary)'
          }}>
            failed to load trends data
          </div>
        )}
      </div>
    </main>
  );
}
