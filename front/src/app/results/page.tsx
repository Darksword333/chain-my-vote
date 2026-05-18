"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertCircle, PieChart as PieChartIcon } from "lucide-react";
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
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function ResultsPage() {
  const { getBallots, provider, signer, address } = useWallet();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!provider && !signer) {
        // Provide mock data if not connected to a wallet
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
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin size-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voting Results</h1>
          <p className="text-muted-foreground mt-1">Real-time breakdown of all ballots.</p>
        </div>
        {!address && (
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <AlertCircle className="size-4 text-amber-500" />
            Showing Mock Data (Connect Wallet)
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {results.map((ballot) => {
          const totalVotes = ballot.voteCounts.reduce((a: number, b: number) => a + b, 0);
          
          // Format data for charts
          const chartData = ballot.options.map((option: string, index: number) => {
            const count = ballot.voteCounts[index] || 0;
            return {
              name: option,
              votes: count,
              percentage: totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0",
            };
          }).sort((a: any, b: any) => b.votes - a.votes); // Sort by highest votes

          const winner = chartData[0];
          const hasVotes = totalVotes > 0;

          return (
            <Card key={ballot.id} className="overflow-hidden border-border/50 shadow-sm bg-card/50">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="text-xl flex items-center justify-between">
                  <span className="truncate pr-4">{ballot.title}</span>
                  <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                    Total Votes: {totalVotes}
                  </Badge>
                </CardTitle>
                {hasVotes && winner.votes > 0 && (
                  <CardDescription className="flex items-center gap-2 mt-2 text-emerald-500 font-medium bg-emerald-500/10 px-3 py-2 rounded-md w-fit">
                    <Trophy className="size-4" />
                    Winner: {winner.name} ({winner.percentage}%)
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Stats List */}
                  <div className="space-y-4 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon className="size-4" />
                      Breakdown
                    </h3>
                    <div className="space-y-3">
                      {chartData.map((data: any, index: number) => (
                        <div key={data.name} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium flex items-center gap-2">
                              <span 
                                className="size-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                              />
                              {data.name}
                            </span>
                            <span className="font-semibold">{data.votes} votes ({data.percentage}%)</span>
                          </div>
                          {/* Progress bar line */}
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
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
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="votes"
                          >
                            {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: any) => [`${value} votes`, name]}
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: '#1f2937', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No votes cast yet
                    </div>
                  )}
                </div>

                {/* Bar Chart Visualization */}
                {hasVotes && (
                  <div className="mt-8 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#fff' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#fff' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: '#1f2937', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry: any, index: number) => (
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
        <div className="text-center py-24 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground mb-4">No ballots found.</p>
          <Button asChild>
            <Link href="/organize">Create a Ballot</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
