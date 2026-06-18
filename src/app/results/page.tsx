"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertCircle, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#6366f1"];

interface BallotData {
  id: string;
  title: string;
  options: string[];
  voteCounts: number[];
}

interface ChartData {
  name: string;
  votes: number;
  percentage: string;
}

export default function ResultsPage() {
  const { getBallots, provider, signer, address } = useWallet();
  const [results, setResults] = useState<BallotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!provider && !signer) {
        setResults([
          {
            id: "0xMock1",
            title: "Best Framework",
            options: ["React", "Vue", "Svelte"],
            voteCounts: [42, 17, 5],
          },
          {
            id: "0xMock2",
            title: "Favorite Language",
            options: ["JavaScript", "Rust", "Go"],
            voteCounts: [120, 95, 80],
          }
        ]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getBallots();
        setResults(data);
      } catch (e) {
        console.error("Failed to load results", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [getBallots, provider, signer]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Calculating results...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart2 className="size-8 text-primary" />
            Live Poll Results
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time charts and summaries of active ballots.</p>
        </div>
        {!address && (
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="size-4" />
            Mock Data (Wallet Disconnected)
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {results.map((ballot) => {
          const totalVotes = ballot.voteCounts.reduce((a, b) => a + b, 0);
          
          const chartData: ChartData[] = ballot.options.map((option, index) => {
            const count = ballot.voteCounts[index] || 0;
            return {
              name: option,
              votes: count,
              percentage: totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0",
            };
          }).sort((a, b) => b.votes - a.votes);

          const maxVotes = chartData[0]?.votes || 0;
          const winners = chartData.filter(d => d.votes === maxVotes && maxVotes > 0);
          const hasVotes = totalVotes > 0;

          return (
            <Card key={ballot.id} className="overflow-hidden border-border shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border pb-4">
                <CardTitle className="text-xl flex items-center justify-between gap-4">
                  <span className="truncate">{ballot.title}</span>
                  <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                    Total: {totalVotes} {totalVotes > 1 ? "votes" : "vote"}
                  </Badge>
                </CardTitle>
                {hasVotes && winners.length > 0 && (
                  <CardDescription className="flex items-center gap-1.5 mt-2 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit text-xs border border-emerald-500/20">
                    <Trophy className="size-4 shrink-0" />
                    <span>
                      {winners.length > 1 ? "Tie" : "Winner"}: {winners.map(w => w.name).join(", ")} ({winners[0].percentage}%)
                    </span>
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stats List */}
                  <div className="space-y-4 flex flex-col justify-center">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon className="size-4" />
                      Vote Distribution
                    </h3>
                    <div className="space-y-3">
                      {chartData.map((data, index) => (
                        <div key={data.name} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium flex items-center gap-2 text-foreground">
                              <span 
                                className="size-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                              />
                              {data.name}
                            </span>
                            <span className="font-bold text-foreground">{data.votes} ({data.percentage}%)</span>
                          </div>
                          {/* Progress bar line */}
                          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500 ease-in-out" 
                              style={{ 
                                width: `${data.percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pie Chart Visualization */}
                  {hasVotes ? (
                    <div className="h-56 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="votes"
                          >
                            {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: any) => [`${value} votes`, name]}
                            contentStyle={{ 
                              borderRadius: '10px', 
                              border: '1px solid var(--border)', 
                              backgroundColor: 'var(--card)', 
                              color: 'var(--foreground)' 
                            }}
                            itemStyle={{ color: 'var(--foreground)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl text-xs">
                      No votes cast yet
                    </div>
                  )}
                </div>

                {/* Bar Chart Visualization */}
                {hasVotes && (
                  <div className="pt-6 border-t border-border/50 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11, fill: 'currentColor' }} 
                          className="text-muted-foreground"
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: 'currentColor' }} 
                          className="text-muted-foreground"
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false} 
                        />
                        <Tooltip 
                          cursor={{ fill: 'var(--accent)', opacity: 0.1 }}
                          contentStyle={{ 
                            borderRadius: '10px', 
                            border: '1px solid var(--border)', 
                            backgroundColor: 'var(--card)', 
                            color: 'var(--foreground)' 
                          }}
                          itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {results.length === 0 && !loading && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground mb-4">No active elections available.</p>
          <Button asChild>
            <Link href="/organize">Create a Ballot</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
