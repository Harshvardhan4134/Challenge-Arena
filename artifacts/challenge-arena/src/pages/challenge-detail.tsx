import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  useGetChallenge, useGetChallengeMessages, useSendMessage, useJoinChallenge,
  useLeaveChallenge, useSubmitResult, useShareRoomDetails, useGetMe,
  getGetChallengeQueryKey, getGetChallengeMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ArrowLeft, Send, Shield, Trophy, Key, Lock, MessageSquare, Users, Clock } from "lucide-react";
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
  if (challenge.isLoading) return <Layout><div className="py-8 text-center font-black text-gray-600">LOADING...</div></Layout>;
  if (!c) return <Layout><div className="py-8 text-center font-black text-gray-600">CHALLENGE NOT FOUND.</div></Layout>;

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

  // Chat only shows when both teams are present (full or in_progress)
  const bothTeamsJoined = !!c.teamA && !!c.teamB && c.teamB.players.length > 0;
  const showChat = inChallenge && bothTeamsJoined;

  const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
    open: { bg: "bg-[#00854B] text-white", label: "OPEN" },
    full: { bg: "bg-[#FF6B00] text-white", label: "FULL" },
    in_progress: { bg: "bg-black text-[#FFE600]", label: "IN PROGRESS" },
    completed: { bg: "bg-gray-600 text-white", label: "COMPLETED" },
    cancelled: { bg: "bg-gray-400 text-white", label: "CANCELLED" },
    disputed: { bg: "bg-[#FF1E56] text-white", label: "DISPUTED" },
  };
  const statusInfo = STATUS_STYLE[c.status] || { bg: "bg-gray-400 text-white", label: c.status.toUpperCase() };

  const inputCls = "w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400";

  return (
    <Layout>
      <div className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate("/challenges")} className="mt-1 text-black hover:text-[#FF6B00] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="tag-orange inline-block mb-1">{c.mode} CHALLENGE</div>
            <h1 className="display-font text-4xl leading-none">{c.title}</h1>
          </div>
          <span className={`text-[10px] font-black font-mono px-2 py-1 mt-1 shrink-0 ${statusInfo.bg}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Schedule & rules */}
        <div className="card-brutal-sm bg-white p-4">
          <div className="section-label mb-2">MATCH INFO</div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Clock className="w-4 h-4 text-[#FF6B00]" />
            {new Date(c.scheduledAt).toLocaleString()}
          </div>
          {c.rules.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {c.rules.map(r => (
                <span key={r} className="tag-orange">{r}</span>
              ))}
            </div>
          )}
          {c.customRule && (
            <div className="mt-2 text-xs font-mono text-gray-600 border-l-4 border-[#FF6B00] pl-2">Custom: {c.customRule}</div>
          )}
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-3">
          {/* Team A */}
          <div className={`card-brutal overflow-hidden ${isTeamALeader ? "border-[#FF6B00]" : ""}`}>
            <div className="bg-black px-3 py-2">
              <div className="text-[10px] font-black font-mono text-[#FFE600]">TEAM A</div>
            </div>
            <div className="bg-white p-3">
              <div className="font-black text-sm truncate mb-3">{c.teamA?.name || "TEAM A"}</div>
              <div className="space-y-1.5">
                {c.teamA?.players.map(p => (
                  <div key={p.userId} className="flex items-center gap-1.5 text-xs">
                    {p.isLeader && <Shield className="w-3 h-3 text-[#FF6B00] shrink-0" />}
                    <span className={cn("truncate font-bold", p.userId === userId ? "text-[#FF6B00]" : "text-black")}>{p.ign || p.username}</span>
                  </div>
                ))}
                {Array.from({ length: (c.teamA?.maxSize ?? 1) - (c.teamA?.players.length ?? 0) }).map((_, i) => (
                  <div key={i} className="text-[10px] font-mono border-2 border-dashed border-gray-300 px-2 py-0.5 text-center text-gray-400">EMPTY</div>
                ))}
              </div>
              {canJoinA && (
                <button
                  onClick={() => { setError(""); joinChallenge.mutate({ challengeId, data: { side: "teamA" } }); }}
                  className="btn-brutal mt-3 w-full py-1.5 text-xs bg-black text-[#FFE600]"
                >
                  JOIN TEAM A
                </button>
              )}
            </div>
          </div>

          {/* Team B */}
          <div className={`card-brutal overflow-hidden ${isTeamBLeader ? "border-[#FF6B00]" : ""}`}>
            <div className="bg-[#FF6B00] px-3 py-2">
              <div className="text-[10px] font-black font-mono text-white">TEAM B</div>
            </div>
            <div className="bg-white p-3">
              <div className="font-black text-sm truncate mb-3">{c.teamB?.name || "— CHALLENGER —"}</div>
              {c.teamB ? (
                <div className="space-y-1.5">
                  {c.teamB.players.map(p => (
                    <div key={p.userId} className="flex items-center gap-1.5 text-xs">
                      {p.isLeader && <Shield className="w-3 h-3 text-[#FF1E56] shrink-0" />}
                      <span className={cn("truncate font-bold", p.userId === userId ? "text-[#FF6B00]" : "text-black")}>{p.ign || p.username}</span>
                    </div>
                  ))}
                  {Array.from({ length: c.teamB.maxSize - c.teamB.players.length }).map((_, i) => (
                    <div key={i} className="text-[10px] font-mono border-2 border-dashed border-gray-300 px-2 py-0.5 text-center text-gray-400">EMPTY</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-mono text-gray-400 text-center py-2 border-2 border-dashed border-gray-200">AWAITING CHALLENGER</div>
              )}
              {canJoinB && (
                <button
                  onClick={() => { setError(""); joinChallenge.mutate({ challengeId, data: { side: "teamB" } }); }}
                  className="btn-brutal mt-3 w-full py-1.5 text-xs bg-[#FF6B00] text-white"
                >
                  CHALLENGE THEM
                </button>
              )}
            </div>
          </div>
        </div>

        {inChallenge && c.status === "open" && !isTeamALeader && (
          <button onClick={() => leaveChallenge.mutate({ challengeId })} className="text-xs font-black text-[#FF1E56] underline hover:opacity-70 transition-opacity">
            Leave challenge
          </button>
        )}

        {error && (
          <div className="border-2 border-[#FF1E56] bg-[#FF1E56]/10 px-3 py-2 text-sm font-black text-[#FF1E56]">
            {error}
          </div>
        )}

        {/* Room details (visible to all in challenge once shared) */}
        {c.roomId && (
          <div className="card-brutal bg-black text-[#FFE600] p-4">
            <div className="section-label text-[#FF6B00] mb-3 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              ROOM DETAILS
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#FFE600]/60 w-24">ROOM ID</span>
                <span className="font-black font-mono text-lg tracking-widest">{c.roomId}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#FFE600]/60 w-24">PASSWORD</span>
                <span className="font-black font-mono text-lg tracking-widest">{c.roomPassword}</span>
              </div>
            </div>
          </div>
        )}

        {/* Share room (Team A leader only) */}
        {isTeamALeader && !c.roomId && (c.status === "full" || c.status === "in_progress" || c.status === "open") && (
          <div className="card-brutal bg-white p-4">
            <div className="section-label mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              SHARE ROOM DETAILS
            </div>
            <div className="space-y-2">
              <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room ID" className={inputCls} />
              <input type="text" value={roomPass} onChange={e => setRoomPass(e.target.value)} placeholder="Room Password" className={inputCls} />
              <button
                onClick={() => shareRoom.mutate({ challengeId, data: { roomId, roomPassword: roomPass } })}
                disabled={!roomId || !roomPass || shareRoom.isPending}
                className="btn-brutal w-full py-2.5 bg-[#FF6B00] text-white text-sm disabled:opacity-50"
              >
                {shareRoom.isPending ? "SHARING..." : "SHARE WITH BOTH TEAMS"}
              </button>
            </div>
          </div>
        )}

        {/* Submit result */}
        {inChallenge && (c.status === "in_progress" || c.status === "full") && (
          <div className="card-brutal bg-white p-4">
            <div className="section-label mb-3 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              SUBMIT RESULT
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setResultSide("teamA")}
                className={cn("py-2.5 border-3 font-black text-sm transition-all", resultSide === "teamA" ? "bg-black text-[#FFE600] border-black" : "bg-white border-black hover:bg-[#FFE600]/30")}
                style={{ border: "3px solid #000" }}
              >
                TEAM A WON
              </button>
              <button
                onClick={() => setResultSide("teamB")}
                className={cn("py-2.5 font-black text-sm transition-all", resultSide === "teamB" ? "bg-[#FF6B00] text-white" : "bg-white hover:bg-[#FFE600]/30")}
                style={{ border: "3px solid #000" }}
              >
                TEAM B WON
              </button>
            </div>
            <button
              onClick={() => resultSide && submitResult.mutate({ challengeId, data: { winningSide: resultSide } })}
              disabled={!resultSide || submitResult.isPending}
              className="btn-brutal w-full py-2.5 bg-[#00854B] text-white text-sm disabled:opacity-50"
            >
              {submitResult.isPending ? "SUBMITTING..." : "SUBMIT RESULT"}
            </button>
          </div>
        )}

        {/* Chat — only shown when both teams have joined */}
        {showChat ? (
          <div className="card-brutal overflow-hidden">
            <div className="bg-black px-4 py-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#FFE600]" />
              <span className="text-[#FFE600] text-xs font-black font-mono tracking-widest">LEADER CHAT</span>
              <span className="ml-auto tag-orange">LEADERS ONLY</span>
            </div>
            <div className="bg-white p-4 space-y-3 max-h-52 overflow-y-auto">
              {messages.isLoading ? (
                <div className="text-center text-xs font-mono text-gray-500">Loading messages...</div>
              ) : messages.data?.length === 0 ? (
                <div className="text-center text-xs font-mono text-gray-500 py-4 border-2 border-dashed border-gray-200">
                  No messages yet. Leaders can chat here.
                </div>
              ) : (
                messages.data?.map(m => (
                  <div key={m.id} className={cn("flex flex-col", m.senderId === userId ? "items-end" : "items-start")}>
                    <div className="text-[9px] font-black font-mono text-gray-500 mb-0.5">{m.senderUsername}</div>
                    <div className={cn(
                      "px-3 py-1.5 text-sm font-bold max-w-[80%] border-2 border-black",
                      m.senderId === userId ? "bg-black text-[#FFE600]" : "bg-[#FFE600] text-black"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            {isLeader ? (
              <div className="flex gap-0 border-t-2 border-black">
                <input
                  type="text"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && msgText.trim()) { sendMsg.mutate({ challengeId, data: { content: msgText } }); } }}
                  placeholder="Send a message..."
                  className="flex-1 px-3 py-2.5 bg-white border-r-2 border-black text-sm font-bold focus:outline-none placeholder:font-normal placeholder:text-gray-400"
                />
                <button
                  onClick={() => msgText.trim() && sendMsg.mutate({ challengeId, data: { content: msgText } })}
                  disabled={!msgText.trim() || sendMsg.isPending}
                  className="px-4 py-2.5 bg-[#FF6B00] text-white hover:bg-[#e05f00] transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="px-4 py-2.5 bg-[#FFE600] border-t-2 border-black text-xs font-black font-mono text-center text-gray-600">
                ONLY TEAM LEADERS CAN CHAT HERE
              </div>
            )}
          </div>
        ) : inChallenge && !bothTeamsJoined ? (
          <div className="card-brutal-sm bg-white p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <div className="text-xs font-black text-gray-600">LEADER CHAT UNLOCKS WHEN BOTH TEAMS JOIN</div>
            <div className="flex gap-1 justify-center mt-2">
              <div className="flex items-center gap-1 text-[9px] font-mono text-gray-500">
                <Users className="w-3 h-3" />
                WAITING FOR TEAM B TO ACCEPT
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
