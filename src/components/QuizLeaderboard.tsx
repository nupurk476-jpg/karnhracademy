import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Clock } from "lucide-react";
import { formatClock as formatTime } from "@/lib/format";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  score: number;
  total_questions: number;
  time_taken_seconds: number;
  created_at: string;
}


const rankIcons = [
  <Trophy key="1" className="h-5 w-5 text-[#C7994A]" />,
  <Medal key="2" className="h-5 w-5 text-gray-400" />,
  <Medal key="3" className="h-5 w-5 text-amber-700" />,
];

const QuizLeaderboard = ({ quizId }: { quizId: string }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));

    const fetchLeaderboard = async () => {
      // Server-side aggregated leaderboard (SECURITY DEFINER RPC).
      const { data } = await supabase.rpc("get_quiz_leaderboard", { _quiz_id: quizId });
      setEntries(((data as LeaderboardEntry[]) || []));
    };

    fetchLeaderboard();
  }, [quizId]);

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
        <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No attempts yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
        <Trophy className="h-6 w-6 text-accent-deep" /> Leaderboard
      </h2>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Player</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Score</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />Time
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const isMe = entry.user_id === currentUserId;
              return (
                <tr
                  key={entry.user_id}
                  className={`border-b border-border last:border-0 transition-colors ${isMe ? "bg-accent/10" : "hover:bg-muted/30"}`}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      {i < 3 ? rankIcons[i] : <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isMe ? "text-accent-deep" : "text-foreground"}`}>
                      {entry.display_name}
                      {isMe && <span className="ml-2 text-xs text-accent-deep">(You)</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-foreground">{entry.score}</span>
                    <span className="text-muted-foreground">/{entry.total_questions}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground tabular-nums">
                    {formatTime(entry.time_taken_seconds)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuizLeaderboard;
