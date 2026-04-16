import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  useGetChallenge, useGetChallengeMessages, useSendMessage, useJoinChallenge,
  useLeaveChallenge, useSubmitResult, useShareRoomDetails, useGetMe,
  getGetChallengeQueryKey, getGetChallengeMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ArrowLeft, Send, Users, Clock, Shield, Trophy, AlertCircle, Lock, Key, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChallengeDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/challenges/:id");
  const challengeId = params?.id ?? "";
  const qc = useQueryClient();

  const me = useGetMe({ query: { queryKey: ["getMe"] } });
  const challenge = useGetChallenge(challengeId, { query: { enabled: !!challengeId, queryKey: getGetChallengeQueryKey(challengeId) } });
  const messages = useGetChallengeMessages(challengeId, { query: { enabled: !!challengeId, queryKey: getGetChallengeMessagesQueryKey(challengeId) } });

  const [msgText, setMsgText] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPass, setRoomPass] = useState("");
  const [resultSide, setResultSide] = useState<"teamA" | "teamB" | "">("");
  const [error, setError] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetChallengeQueryKey(challengeId) });
    qc.invalidateQueries({ queryKey: getGetChallengeMessagesQueryKey(challengeId) });
  };

  const joinChallenge = useJoinChallenge({ mutation: { onSuccess: invalidate, onError: (e: any) => setError(e?.data?.message || "Failed to join") } });
  const leaveChallenge = useLeaveChallenge({ mutation: { onSuccess: invalidate } });
  const submitResult = useSubmitResult({ mutation: { onSuccess: invalidate, onError: (e: any) => setError(e?.data?.message || "Failed to submit") } });
  const shareRoom = useShareRoomDetails({ mutation: { onSuccess: invalidate, onError: (e: any) => setError(e?.data?.message || "Failed to share room") } });
  const sendMsg = useSendMessage({ mutation: { onSuccess: () => { setMsgText(""); invalidate(); } } });

  if (!challengeId) return null;
  const c = challenge.data;
  if (challenge.isLoading) return <Layout><div className="py-8 text-center text-muted-foreground text-sm">Loading...</div></Layout>;
  if (!c) return <Layout><div className="py-8 text-center text-muted-foreground text-sm">Challenge not found.</div></Layout>;

  const userId = me.data?.id;
  const teamALeaderId = c.teamA?.leaderId;
  const teamBLeaderId = c.teamB?.leaderId;
  const isTeamALeader = userId === teamALeaderId;
  const isTeamBLeader = userId === teamBLeaderId;
  const isLeader = isTeamALeader || isTeamBLeader;
  const inTeamA = c.teamA?.players.some(p => p.userId === userId);
  const inTeamB = c.teamB?.players.some(p => p.userId === userId);
  const inChallenge = inTeamA || inTeamB;

  const canJoinA = !inChallenge && (c.teamA?.players.length ?? 0) < (c.teamA?.maxSize ?? 1) && c.status === "open";
  const canJoinB = !inChallenge && c.status === "open";

  const STATUS_COLORS: Record<string, string> = {
    open: "text-green-400 border-green-500/40 bg-green-500/10",
    full: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    in_progress: "text-primary border-primary/40 bg-primary/10",
    completed: "text-muted-foreground border-border bg-card",
    cancelled: "text-muted-foreground border-border",
    disputed: "text-destructive border-destructive/40 bg-destructive/10",
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate("/challenges")} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black">{c.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-primary font-bold">{c.mode}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] || ""}`}>
                {c.status.toUpperCase().replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule & rules */}
        <div className="border border-border rounded-lg bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date(c.scheduledAt).toLocaleString()}
          </div>
          {c.rules.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.rules.map(r => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded border border-border/60 text-muted-foreground font-mono bg-background">{r}</span>
              ))}
            </div>
          )}
          {c.customRule && (
            <div className="text-xs text-muted-foreground italic">Custom: {c.customRule}</div>
          )}
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-3">
          {/* Team A */}
          <div className={cn("border rounded-lg bg-card p-3", isTeamALeader ? "border-primary/40" : "border-border")}>
            <div className="text-[10px] font-mono text-muted-foreground mb-1">TEAM A</div>
            <div className="font-bold text-sm truncate mb-2">{c.teamA?.name || "Team A"}</div>
            <div className="space-y-1">
              {c.teamA?.players.map(p => (
                <div key={p.userId} className="flex items-center gap-1.5 text-xs">
                  {p.isLeader && <Shield className="w-3 h-3 text-primary shrink-0" />}
                  <span className={cn("truncate", p.userId === userId ? "text-primary font-semibold" : "")}>{p.ign || p.username}</span>
                </div>
              ))}
              {Array.from({ length: (c.teamA?.maxSize ?? 1) - (c.teamA?.players.length ?? 0) }).map((_, i) => (
                <div key={i} className="text-xs text-muted-foreground/40 border border-dashed border-border/40 rounded px-2 py-0.5 text-center">empty</div>
              ))}
            </div>
            {canJoinA && (
              <button onClick={() => { setError(""); joinChallenge.mutate({ challengeId, data: { side: "teamA" } }); }} className="mt-2 w-full py-1.5 text-xs border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors">
                Join Team A
              </button>
            )}
          </div>

          {/* Team B */}
          <div className={cn("border rounded-lg bg-card p-3", isTeamBLeader ? "border-primary/40" : "border-border")}>
            <div className="text-[10px] font-mono text-muted-foreground mb-1">TEAM B</div>
            <div className="font-bold text-sm truncate mb-2">{c.teamB?.name || "— Challenger —"}</div>
            {c.teamB ? (
              <div className="space-y-1">
                {c.teamB.players.map(p => (
                  <div key={p.userId} className="flex items-center gap-1.5 text-xs">
                    {p.isLeader && <Shield className="w-3 h-3 text-accent shrink-0" />}
                    <span className={cn("truncate", p.userId === userId ? "text-primary font-semibold" : "")}>{p.ign || p.username}</span>
                  </div>
                ))}
                {Array.from({ length: (c.teamB.maxSize) - (c.teamB.players.length) }).map((_, i) => (
                  <div key={i} className="text-xs text-muted-foreground/40 border border-dashed border-border/40 rounded px-2 py-0.5 text-center">empty</div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/50 text-center py-2">No challengers yet</div>
            )}
            {canJoinB && (
              <button onClick={() => { setError(""); joinChallenge.mutate({ challengeId, data: { side: "teamB" } }); }} className="mt-2 w-full py-1.5 text-xs border border-accent/40 text-accent rounded hover:bg-accent/10 transition-colors">
                Challenge Them
              </button>
            )}
          </div>
        </div>

        {inChallenge && c.status === "open" && !isTeamALeader && (
          <button onClick={() => leaveChallenge.mutate({ challengeId })} className="text-xs text-muted-foreground hover:text-destructive transition-colors underline">
            Leave challenge
          </button>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Room details */}
        {c.roomId && (
          <div className="border border-primary/30 rounded-lg bg-primary/5 p-4 glow-cyan">
            <div className="flex items-center gap-2 text-primary text-xs font-mono mb-3">
              <Key className="w-3.5 h-3.5" />
              ROOM DETAILS
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">Room ID:</span>
                <span className="font-mono font-bold text-sm">{c.roomId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">Password:</span>
                <span className="font-mono font-bold text-sm">{c.roomPassword}</span>
              </div>
            </div>
          </div>
        )}

        {/* Share room (Team A leader only) */}
        {isTeamALeader && !c.roomId && (c.status === "full" || c.status === "in_progress" || c.status === "open") && (
          <div className="border border-border rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-3">
              <Lock className="w-3.5 h-3.5" />
              SHARE ROOM DETAILS
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="Room ID"
                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                value={roomPass}
                onChange={e => setRoomPass(e.target.value)}
                placeholder="Room Password"
                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => shareRoom.mutate({ challengeId, data: { roomId, roomPassword: roomPass } })}
                disabled={!roomId || !roomPass || shareRoom.isPending}
                className="w-full py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {shareRoom.isPending ? "Sharing..." : "Share with Both Teams"}
              </button>
            </div>
          </div>
        )}

        {/* Submit result */}
        {inChallenge && (c.status === "in_progress" || c.status === "full") && (
          <div className="border border-border rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-3">
              <Trophy className="w-3.5 h-3.5" />
              SUBMIT RESULT
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => setResultSide("teamA")}
                className={cn("py-2 rounded border text-sm font-bold transition-all", resultSide === "teamA" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
              >
                Team A Won
              </button>
              <button
                onClick={() => setResultSide("teamB")}
                className={cn("py-2 rounded border text-sm font-bold transition-all", resultSide === "teamB" ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:border-accent/40")}
              >
                Team B Won
              </button>
            </div>
            <button
              onClick={() => resultSide && submitResult.mutate({ challengeId, data: { winningSide: resultSide } })}
              disabled={!resultSide || submitResult.isPending}
              className="w-full py-2 bg-accent text-accent-foreground rounded text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitResult.isPending ? "Submitting..." : "Submit Result"}
            </button>
          </div>
        )}

        {/* Chat */}
        <div className="border border-border rounded-lg bg-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">LEADER CHAT</span>
          </div>
          <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
            {messages.isLoading ? (
              <div className="text-center text-xs text-muted-foreground">Loading messages...</div>
            ) : messages.data?.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground">No messages yet. Leaders can chat here.</div>
            ) : (
              messages.data?.map(m => (
                <div key={m.id} className={cn("flex flex-col", m.senderId === userId ? "items-end" : "items-start")}>
                  <div className="text-[10px] text-muted-foreground mb-0.5 font-mono">{m.senderUsername}</div>
                  <div className={cn("px-3 py-1.5 rounded text-sm max-w-[80%]", m.senderId === userId ? "bg-primary text-primary-foreground" : "bg-background border border-border")}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          {isLeader && (
            <div className="flex gap-2 px-4 pb-4">
              <input
                type="text"
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && msgText.trim()) { sendMsg.mutate({ challengeId, data: { content: msgText } }); } }}
                placeholder="Send a message..."
                className="flex-1 px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => msgText.trim() && sendMsg.mutate({ challengeId, data: { content: msgText } })}
                disabled={!msgText.trim() || sendMsg.isPending}
                className="p-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}
