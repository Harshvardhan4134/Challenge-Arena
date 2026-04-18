import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  useGetChallenge, useGetChallengeMessages, useSendMessage, useJoinChallenge,
  useLeaveChallenge, useSubmitResult, useShareRoomDetails, useGetMe,
  useReportChallengePlayer, useRematchChallenge,
  getGetChallengeQueryKey, getGetChallengeMessagesQueryKey,
} from "@workspace/api-client-react";
import type { ReportPlayerBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ArrowLeft, Send, Shield, Trophy, Key, Lock, MessageSquare, Users, Clock, Copy, Check, Link2, Upload, X, Flag, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChallengeRuleId } from "@/lib/challenge-rules";
import { apiUrl } from "@/lib/api-url";
import { getAuthToken } from "@/lib/auth";

/** Max file size for match proof before upload to Firebase Storage (via API). */
const RESULT_PROOF_MAX_FILE_BYTES = 5 * 1024 * 1024;

const POST_MATCH_STATUSES = ["completed", "disputed", "cancelled"] as const;

const REPORT_OPTIONS: { value: ReportPlayerBody["category"]; label: string }[] = [
  { value: "cheating", label: "Cheating / unfair play" },
  { value: "harassment", label: "Harassment or toxic behavior" },
  { value: "fake_result", label: "Fake or wrong result" },
  { value: "no_show", label: "No-show / abandoned match" },
  { value: "other", label: "Other (describe below)" },
];

function useCountdown(target: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLabel("STARTED"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setLabel(`${h}h ${m}m`);
      else if (m > 0) setLabel(`${m}m ${s}s`);
      else setLabel(`${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

function buildChallengeInviteUrl(challengeId: string, invite: "team" | "challenger"): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = `${base}/challenges/${challengeId}?invite=${invite}`;
  return new URL(path, window.location.origin).href;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} className="ml-auto p-1 text-[#FFE600] hover:text-[#FF6B00] transition-colors">
      {copied ? <Check className="w-4 h-4 text-[#00854B]" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function ChallengeDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/challenges/:id");
  const challengeId = params?.id ?? "";
  const search = useSearch();
  const qc = useQueryClient();
  const teamAInviteRef = useRef<HTMLDivElement>(null);
  const inviteHandledRef = useRef<string | null>(null);

  const me = useGetMe({ query: { queryKey: ["getMe"] } });
  const challenge = useGetChallenge(challengeId, {
    query: { enabled: !!challengeId, queryKey: getGetChallengeQueryKey(challengeId), refetchInterval: 5000 },
  });
  const messages = useGetChallengeMessages(challengeId, {
    query: { enabled: !!challengeId, queryKey: getGetChallengeMessagesQueryKey(challengeId), refetchInterval: 3000 },
  });

  const [msgText, setMsgText] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPass, setRoomPass] = useState("");
  const [resultSide, setResultSide] = useState<"teamA" | "teamB" | "not_played" | "">("");
  const [resultProofDataUrl, setResultProofDataUrl] = useState("");
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [error, setError] = useState("");

  // Team name for joining as Team B leader
  const [joinTeamName, setJoinTeamName] = useState("");
  const [showJoinBForm, setShowJoinBForm] = useState(false);

  const [reportTargetId, setReportTargetId] = useState("");
  const [reportCategory, setReportCategory] = useState<ReportPlayerBody["category"]>("cheating");
  const [reportDetails, setReportDetails] = useState("");
  const [rematchAt, setRematchAt] = useState("");
  const [rematchTeamName, setRematchTeamName] = useState("");
  const [postMatchNotice, setPostMatchNotice] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetChallengeQueryKey(challengeId) });
    qc.invalidateQueries({ queryKey: getGetChallengeMessagesQueryKey(challengeId) });
  };

  const joinChallenge = useJoinChallenge({ mutation: { onSuccess: () => { invalidate(); setShowJoinBForm(false); setJoinTeamName(""); }, onError: (e: any) => setError(e?.data?.message || "Failed to join") } });
  const leaveChallenge = useLeaveChallenge({ mutation: { onSuccess: invalidate } });
  const submitResult = useSubmitResult({
    mutation: {
      onSuccess: () => {
        invalidate();
        setResultProofDataUrl("");
        setResultSide("");
        if (proofFileInputRef.current) proofFileInputRef.current.value = "";
      },
      onError: (e: any) => setError(e?.data?.message || "Failed to submit"),
    },
  });
  const shareRoom = useShareRoomDetails({ mutation: { onSuccess: invalidate, onError: (e: any) => setError(e?.data?.message || "Failed to share room") } });
  const sendMsg = useSendMessage({ mutation: { onSuccess: () => { setMsgText(""); invalidate(); } } });
  const reportPlayer = useReportChallengePlayer({
    mutation: {
      onSuccess: () => {
        setReportDetails("");
        setPostMatchNotice("Report submitted. Moderators can review it in admin tools.");
        setError("");
      },
      onError: (e: any) => setError(e?.data?.message || "Could not submit report"),
    },
  });
  const rematchMut = useRematchChallenge({
    mutation: {
      onSuccess: (data) => {
        setPostMatchNotice("");
        navigate(`/challenges/${data.id}`);
      },
      onError: (e: any) => setError(e?.data?.message || "Could not create rematch"),
    },
  });

  useEffect(() => {
    inviteHandledRef.current = null;
  }, [challengeId]);

  useEffect(() => {
    setReportTargetId("");
    setReportDetails("");
    setReportCategory("cheating");
    setRematchAt("");
    setRematchTeamName("");
    setPostMatchNotice("");
  }, [challengeId]);

  useEffect(() => {
    if (!challengeId || !search || challenge.isLoading) return;
    const ch = challenge.data;
    if (!ch) return;

    const pendingB = (ch as { pendingTeamB?: { leaderId: string; players: Array<{ userId: string }> } }).pendingTeamB;
    const uid = me.data?.id;
    const inA = ch.teamA?.players.some((p) => p.userId === uid) ?? false;
    const inB = ch.teamB?.players.some((p) => p.userId === uid) ?? false;
    const inPendingB = pendingB?.players?.some((p) => p.userId === uid) ?? false;
    const inCh = inA || inB;
    const started = Date.now() >= new Date(ch.scheduledAt).getTime();
    const canJB = !inCh && !inPendingB && !pendingB && ch.status === "open" && !started;

    const params = new URLSearchParams(search);
    const invite = params.get("invite");
    if (!invite) return;
    const key = `${ch.id}:${invite}`;
    if (inviteHandledRef.current === key) return;

    if (invite === "team" && (ch.mode === "2v2" || ch.mode === "4v4")) {
      inviteHandledRef.current = key;
      requestAnimationFrame(() => {
        teamAInviteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    if (invite === "challenger") {
      if (inviteHandledRef.current === key) return;
      if (!canJB) {
        inviteHandledRef.current = key;
        return;
      }
      inviteHandledRef.current = key;
      if (ch.teamB) {
        joinChallenge.mutate({ challengeId, data: { side: "teamB" } });
      } else {
        setShowJoinBForm(true);
      }
    }
  }, [challengeId, search, challenge.data, challenge.isLoading, me.data?.id, joinChallenge]);

  const countdown = useCountdown(challenge.data?.scheduledAt ?? new Date().toISOString());

  if (!challengeId) return null;
  const c = challenge.data;
  if (challenge.isLoading) return <Layout><div className="py-8 text-center font-black text-black">LOADING...</div></Layout>;
  if (!c) return <Layout><div className="py-8 text-center font-black text-black">CHALLENGE NOT FOUND.</div></Layout>;

  const pendingTeamB = (c as any).pendingTeamB as { leaderId: string; players: Array<{ userId: string }> } | null | undefined;
  const userId = me.data?.id;
  const teamALeaderId = c.teamA?.leaderId;
  const teamBLeaderId = c.teamB?.leaderId;
  const isTeamALeader = userId === teamALeaderId;
  const isTeamBLeader = userId === teamBLeaderId;
  const inTeamA = c.teamA?.players.some(p => p.userId === userId);
  const inTeamB = c.teamB?.players.some(p => p.userId === userId);
  const inPendingTeamB = pendingTeamB?.players?.some((p) => p.userId === userId) ?? false;
  const inChallenge = inTeamA || inTeamB;
  const isPostMatch = POST_MATCH_STATUSES.includes(c.status as (typeof POST_MATCH_STATUSES)[number]);
  const canPostMatchActions = inChallenge && !!c.teamB && isPostMatch;
  const opponentPlayers = inTeamA ? (c.teamB?.players ?? []) : (c.teamA?.players ?? []);
  const reportTargetValue = reportTargetId || opponentPlayers[0]?.userId || "";
  const customRulesList =
    c.customRules && c.customRules.length > 0
      ? c.customRules
      : c.customRule
        ? [c.customRule]
        : [];
  const isPendingChallengerLeader = Boolean(pendingTeamB?.leaderId && pendingTeamB.leaderId === userId);
  const canAcceptPendingChallenger = isTeamALeader && !c.teamB && !!pendingTeamB;
  const hasMatchStarted = Date.now() >= new Date(c.scheduledAt).getTime();
  /** Room shared and teams locked in — host can submit result after scheduled time (not gated on hasMatchStarted). */
  const canSubmitOrAwaitResult =
    Boolean(c.roomId) && (c.status === "in_progress" || c.status === "full");

  const canJoinA = !inChallenge && !inPendingTeamB && !pendingTeamB && (c.teamA?.players.length ?? 0) < (c.teamA?.maxSize ?? 1) && c.status === "open" && !hasMatchStarted;
  const canJoinB = !inChallenge && !inPendingTeamB && !pendingTeamB && c.status === "open" && !hasMatchStarted;

  const slotsOnA = (c.teamA?.maxSize ?? 1) - (c.teamA?.players.length ?? 0);
  const showHostTeammateLink =
    isTeamALeader && !hasMatchStarted && (c.mode === "2v2" || c.mode === "4v4") && slotsOnA > 0 && c.status === "open";
  const showHostOpponentLink =
    isTeamALeader && !hasMatchStarted && c.mode === "1v1" && !c.teamB && !pendingTeamB && c.status === "open";
  const slotsOnB = c.teamB ? c.teamB.maxSize - c.teamB.players.length : 0;
  const showChallengerSquadLink =
    isTeamBLeader &&
    !hasMatchStarted &&
    (c.mode === "2v2" || c.mode === "4v4") &&
    !!c.teamB &&
    slotsOnB > 0 &&
    c.status === "open";

  // Chat only shows when both teams are present
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

  const inputCls = "w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold text-black focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400";
  const acceptPendingChallenger = async () => {
    setError("");
    const token = getAuthToken();
    if (!token) return setError("Please login again.");
    const res = await fetch(apiUrl(`/api/challenges/${challengeId}/accept-challenger`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body?.message || "Could not accept challenger.");
    invalidate();
  };
  const onPickProofImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, etc.).");
      e.target.value = "";
      return;
    }
    if (file.size > RESULT_PROOF_MAX_FILE_BYTES) {
      setError(`Image must be ${RESULT_PROOF_MAX_FILE_BYTES / (1024 * 1024)}MB or smaller.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setResultProofDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearProofImage = () => {
    setResultProofDataUrl("");
    if (proofFileInputRef.current) proofFileInputRef.current.value = "";
  };

  const uploadProofToFirebaseStorage = async (): Promise<string> => {
    const token = getAuthToken();
    if (!token) throw new Error("Please login again.");
    const res = await fetch(apiUrl(`/api/challenges/${challengeId}/result-proof-upload`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageBase64: resultProofDataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data?.message === "string" ? data.message : "Could not upload screenshot to storage.",
      );
    }
    if (typeof data.url !== "string" || !data.url) {
      throw new Error("Upload did not return an image URL.");
    }
    return data.url;
  };

  const handleSubmitMatchResult = async () => {
    if (!resultSide) return;
    setError("");
    let screenshotUrl = "";
    try {
      if (resultSide !== "not_played") {
        if (!resultProofDataUrl.trim()) {
          setError("Upload a screenshot for win/loss results.");
          return;
        }
        setProofUploading(true);
        screenshotUrl = await uploadProofToFirebaseStorage();
      } else if (resultProofDataUrl.trim()) {
        setProofUploading(true);
        screenshotUrl = await uploadProofToFirebaseStorage();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      return;
    } finally {
      setProofUploading(false);
    }
    submitResult.mutate({ challengeId, data: { winningSide: resultSide, screenshotUrl } });
  };

  return (
    <Layout>
      <div className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate("/challenges")} className="mt-1 text-black hover:text-[#FF6B00] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="tag-orange inline-block mb-1">{c.mode} MATCH</div>
            <h1 className="display-font text-4xl leading-none text-black">{c.title}</h1>
          </div>
          <span className={`text-[10px] font-black font-mono px-2 py-1 mt-1 shrink-0 ${statusInfo.bg}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Schedule, countdown & rules */}
        <div className="card-brutal-sm bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black font-mono text-[#FF6B00] uppercase tracking-widest">MATCH INFO</span>
            <div className="flex items-center gap-1.5 bg-black px-2 py-0.5">
              <Clock className="w-3 h-3 text-[#FFE600]" />
              <span className="font-black font-mono text-xs text-[#FFE600]">{countdown}</span>
            </div>
          </div>
          <div className="text-sm font-bold text-black">
            {new Date(c.scheduledAt).toLocaleString()}
          </div>
          {c.rules.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {c.rules.map((r) => (
                <span key={r} className="tag-orange">{formatChallengeRuleId(r)}</span>
              ))}
            </div>
          )}
          {customRulesList.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[9px] font-black font-mono text-gray-500 uppercase">Custom rules</div>
              {customRulesList.map((rule, i) => (
                <div
                  key={`${i}-${rule.slice(0, 24)}`}
                  className="text-xs font-mono text-gray-700 border-l-4 border-[#FF6B00] pl-2"
                >
                  {rule}
                </div>
              ))}
            </div>
          )}
        </div>

        {(showHostTeammateLink || showHostOpponentLink || showChallengerSquadLink) && (
          <div className="card-brutal bg-white p-4 border-[#00854B]">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-[#00854B]" />
              <span className="text-[10px] font-black font-mono text-black uppercase tracking-widest">Invite links</span>
            </div>
            <p className="text-[9px] font-mono text-gray-600 mb-3 leading-snug">
              Share a link so players open this match logged in (or log in and return here). 2v2/4v4 host: fill your squad.
              1v1 host: opponent joins as challenger.
            </p>
            <div className="space-y-2">
              {showHostTeammateLink && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center border-2 border-black p-2 bg-[#FFE600]/15">
                  <span className="text-[9px] font-black text-black shrink-0 sm:max-w-[140px]">Teammates (your roster, Team A)</span>
                  <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                    <span className="text-[8px] font-mono truncate text-gray-600">{buildChallengeInviteUrl(challengeId, "team")}</span>
                    <CopyButton value={buildChallengeInviteUrl(challengeId, "team")} />
                  </div>
                </div>
              )}
              {showHostOpponentLink && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center border-2 border-black p-2 bg-[#FFE600]/15">
                  <span className="text-[9px] font-black text-black shrink-0 sm:max-w-[140px]">Opponent (challenges you, Team B)</span>
                  <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                    <span className="text-[8px] font-mono truncate text-gray-600">{buildChallengeInviteUrl(challengeId, "challenger")}</span>
                    <CopyButton value={buildChallengeInviteUrl(challengeId, "challenger")} />
                  </div>
                </div>
              )}
              {showChallengerSquadLink && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center border-2 border-black p-2 bg-[#FF6B00]/10">
                  <span className="text-[9px] font-black text-black shrink-0 sm:max-w-[140px]">Challenger squad (your roster, Team B)</span>
                  <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                    <span className="text-[8px] font-mono truncate text-gray-600">{buildChallengeInviteUrl(challengeId, "challenger")}</span>
                    <CopyButton value={buildChallengeInviteUrl(challengeId, "challenger")} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Teams */}
        <div className="grid grid-cols-2 gap-3">
          {/* Team A */}
          <div ref={teamAInviteRef} className={`card-brutal overflow-hidden ${isTeamALeader ? "border-[#FF6B00]" : ""}`}>
            <div className="bg-black px-3 py-2">
              <div className="text-[10px] font-black font-mono text-[#FFE600]">TEAM A</div>
            </div>
            <div className="bg-white p-3">
              <div className="font-black text-sm truncate mb-3 text-black">{c.teamA?.name || "TEAM A"}</div>
              <div className="space-y-1.5">
                {c.teamA?.players.map(p => (
                  <div key={p.userId} className="flex items-center gap-1.5 text-xs">
                    {p.isLeader && <Shield className="w-3 h-3 text-[#FF6B00] shrink-0" />}
                    <span className={cn("truncate font-bold", p.userId === userId ? "text-[#FF6B00]" : "text-black")}>{p.ign || p.username}</span>
                    {p.userId === userId && <span className="text-[9px] font-mono text-[#FF6B00] ml-auto">YOU</span>}
                  </div>
                ))}
                {Array.from({ length: (c.teamA?.maxSize ?? 1) - (c.teamA?.players.length ?? 0) }).map((_, i) => (
                  <div key={i} className="text-[10px] font-mono border-2 border-dashed border-gray-300 px-2 py-0.5 text-center text-gray-400">EMPTY</div>
                ))}
              </div>
              {canJoinA && (
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => { setError(""); joinChallenge.mutate({ challengeId, data: { side: "teamA" } }); }}
                    className="btn-brutal w-full py-1.5 text-xs bg-black text-[#FFE600]"
                  >
                    JOIN HOST TEAM (OPEN SLOT)
                  </button>
                  <p className="text-[9px] font-mono text-gray-500 leading-snug">
                    Joining fills a free spot on the host roster (Team A).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Team B */}
          <div className={`card-brutal overflow-hidden ${isTeamBLeader ? "border-[#FF6B00]" : ""}`}>
            <div className="bg-[#FF6B00] px-3 py-2">
              <div className="text-[10px] font-black font-mono text-white">TEAM B</div>
            </div>
            <div className="bg-white p-3">
              <div className="font-black text-sm truncate mb-3 text-black">{c.teamB?.name || "— CHALLENGER —"}</div>
              {c.teamB ? (
                <div className="space-y-1.5">
                  {c.teamB.players.map(p => (
                    <div key={p.userId} className="flex items-center gap-1.5 text-xs">
                      {p.isLeader && <Shield className="w-3 h-3 text-[#FF1E56] shrink-0" />}
                      <span className={cn("truncate font-bold", p.userId === userId ? "text-[#FF6B00]" : "text-black")}>{p.ign || p.username}</span>
                      {p.userId === userId && <span className="text-[9px] font-mono text-[#FF6B00] ml-auto">YOU</span>}
                    </div>
                  ))}
                  {Array.from({ length: c.teamB.maxSize - c.teamB.players.length }).map((_, i) => (
                    <div key={i} className="text-[10px] font-mono border-2 border-dashed border-gray-300 px-2 py-0.5 text-center text-gray-400">EMPTY</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-mono text-gray-500 text-center py-2 border-2 border-dashed border-gray-200">AWAITING CHALLENGER</div>
              )}
              {canJoinB && !showJoinBForm && (
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => { setError(""); setShowJoinBForm(true); }}
                    className="btn-brutal w-full py-1.5 text-xs bg-[#FF6B00] text-white"
                  >
                    COMPETE VS HOST (REQUEST)
                  </button>
                  <p className="text-[9px] font-mono text-gray-500 leading-snug">
                    You are the challenger side — the <strong>host leader must approve</strong> before the match locks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Join Team B — team name form */}
        {showJoinBForm && (
          <div className="card-brutal bg-white p-4">
            <div className="text-[10px] font-black font-mono text-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2">
              YOUR CHALLENGER TEAM NAME
            </div>
            <p className="text-[9px] font-mono text-gray-600 mb-2">
              After you send this, the host (Team A leader) approves your team before you are fully in.
            </p>
            <input
              type="text"
              value={joinTeamName}
              onChange={e => setJoinTeamName(e.target.value)}
              placeholder="e.g. Shadow Squad"
              autoFocus
              className={inputCls + " mb-3"}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setShowJoinBForm(false); setJoinTeamName(""); }}
                className="py-2.5 border-2 border-black font-black text-xs text-black bg-white hover:bg-gray-100 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (!joinTeamName.trim()) return setError("Please enter a team name.");
                  setError("");
                  joinChallenge.mutate({ challengeId, data: { side: "teamB", teamName: joinTeamName.trim() } });
                }}
                disabled={joinChallenge.isPending}
                className="btn-brutal py-2.5 text-xs bg-[#FF6B00] text-white disabled:opacity-60"
              >
                {joinChallenge.isPending ? "JOINING..." : "CONFIRM & JOIN"}
              </button>
            </div>
          </div>
        )}

        {pendingTeamB && !c.teamB && (
          <div className="card-brutal bg-white p-4">
            <div className="text-[10px] font-black font-mono text-black uppercase tracking-widest mb-2">
              CHALLENGER REQUEST — HOST APPROVAL
            </div>
            <div className="text-xs font-bold text-gray-700 mb-3">
              The <strong>Team A leader (host)</strong> must approve the challenger roster before this match is locked in.
            </div>
            {canAcceptPendingChallenger ? (
              <button
                onClick={acceptPendingChallenger}
                className="btn-brutal w-full py-2.5 text-xs bg-[#00854B] text-white"
              >
                APPROVE CHALLENGER TEAM
              </button>
            ) : isPendingChallengerLeader || inPendingTeamB ? (
              <div className="text-xs font-black text-[#FF6B00]">Waiting for host (Team A leader) to approve your team.</div>
            ) : null}
          </div>
        )}

        {inChallenge && c.status === "open" && !isTeamALeader && (
          <button onClick={() => leaveChallenge.mutate({ challengeId })} className="text-xs font-black text-[#FF1E56] underline hover:opacity-70 transition-opacity">
            Leave challenge
          </button>
        )}

        {error && (
          <div className="border-2 border-[#FF1E56] bg-[#FF1E56] px-3 py-2 text-sm font-black text-white">
            {error}
          </div>
        )}

        {/* Room details (visible to all in challenge once shared) */}
        {c.roomId && inChallenge && (
          <div className="card-brutal bg-black text-[#FFE600] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Key className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span className="text-[10px] font-black font-mono text-[#FF6B00] uppercase tracking-widest">ROOM DETAILS</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/10 px-3 py-2">
                <div>
                  <div className="text-[9px] font-mono text-[#FFE600]/60 mb-0.5">ROOM ID</div>
                  <span className="font-black font-mono text-lg tracking-widest text-[#FFE600]">{c.roomId}</span>
                </div>
                <CopyButton value={c.roomId} />
              </div>
              <div className="flex items-center gap-3 bg-white/10 px-3 py-2">
                <div>
                  <div className="text-[9px] font-mono text-[#FFE600]/60 mb-0.5">PASSWORD</div>
                  <span className="font-black font-mono text-lg tracking-widest text-[#FFE600]">{c.roomPassword}</span>
                </div>
                <CopyButton value={c.roomPassword ?? ""} />
              </div>
            </div>
          </div>
        )}

        {/* Share room (Team A leader only) */}
        {isTeamALeader && !hasMatchStarted && !c.roomId && (c.status === "full" || c.status === "in_progress" || c.status === "open") && (
          <div className="card-brutal bg-white p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span className="text-[10px] font-black font-mono text-black uppercase tracking-widest">SHARE ROOM DETAILS</span>
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

        {/* Submit result — ONLY the challenge creator (Team A leader); shown after room is shared, including after scheduled start */}
        {isTeamALeader && canSubmitOrAwaitResult && (
          <div className="card-brutal bg-white p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span className="text-[10px] font-black font-mono text-black uppercase tracking-widest">SUBMIT MATCH RESULT</span>
            </div>
            <div className="text-[10px] font-mono text-gray-500 mb-3">Only you (challenge creator) can post the result.</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setResultSide("teamA")}
                className={cn("py-2.5 font-black text-sm transition-all", resultSide === "teamA" ? "bg-black text-[#FFE600]" : "bg-white text-black hover:bg-[#FFE600]/30")}
                style={{ border: "3px solid #000" }}
              >
                {c.teamA?.name || "TEAM A"} WON
              </button>
              <button
                onClick={() => setResultSide("teamB")}
                className={cn("py-2.5 font-black text-sm transition-all", resultSide === "teamB" ? "bg-[#FF6B00] text-white" : "bg-white text-black hover:bg-[#FFE600]/30")}
                style={{ border: "3px solid #000" }}
              >
                {c.teamB?.name || "TEAM B"} WON
              </button>
              <button
                onClick={() => setResultSide("not_played")}
                className={cn("py-2.5 font-black text-sm transition-all", resultSide === "not_played" ? "bg-gray-600 text-white" : "bg-white text-black hover:bg-[#FFE600]/30")}
                style={{ border: "3px solid #000" }}
              >
                MATCH NOT TAKEN
              </button>
            </div>
            <div className="space-y-2 mb-3">
              <div className="text-[10px] font-mono text-gray-500">
                Screenshot is stored in Firebase Storage, then linked to your result. Required for win/loss; optional for
                &quot;Match not taken&quot;. Max {RESULT_PROOF_MAX_FILE_BYTES / (1024 * 1024)}MB.
              </div>
              <input
                ref={proofFileInputRef}
                id="result-proof-file"
                type="file"
                accept="image/*"
                onChange={onPickProofImage}
                className="sr-only"
              />
              <label
                htmlFor="result-proof-file"
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-black bg-[#FFE600]/20 cursor-pointer hover:bg-[#FFE600]/40 transition-colors"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span className="text-xs font-black text-black">
                  {resultProofDataUrl ? "Replace screenshot" : "Choose screenshot image"}
                </span>
              </label>
              {resultProofDataUrl ? (
                <div className="relative border-2 border-black bg-gray-50 p-2 inline-block max-w-full">
                  <button
                    type="button"
                    onClick={clearProofImage}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-[#FF1E56] text-white border-2 border-black flex items-center justify-center hover:opacity-90"
                    aria-label="Remove screenshot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img src={resultProofDataUrl} alt="Result proof preview" className="max-h-48 max-w-full object-contain" />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void handleSubmitMatchResult()}
              disabled={
                !resultSide ||
                (resultSide !== "not_played" && !resultProofDataUrl.trim()) ||
                submitResult.isPending ||
                proofUploading
              }
              className="btn-brutal w-full py-2.5 bg-[#00854B] text-white text-sm disabled:opacity-50"
            >
              {proofUploading ? "UPLOADING..." : submitResult.isPending ? "SUBMITTING..." : "SUBMIT RESULT"}
            </button>
          </div>
        )}

        {/* Non-creator members see a notice instead */}
        {!isTeamALeader && inChallenge && canSubmitOrAwaitResult && (
          <div className="card-brutal-sm bg-white p-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs font-black text-gray-600">RESULT IS SUBMITTED BY THE CHALLENGE CREATOR</span>
          </div>
        )}

        {canPostMatchActions && (
          <div className="card-brutal bg-white p-4 border-2 border-black space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2">
              <Flag className="w-4 h-4 text-[#FF6B00]" />
              <span className="text-[10px] font-black font-mono uppercase tracking-widest">After the match</span>
            </div>
            {postMatchNotice ? (
              <div className="text-xs font-bold text-[#00854B] border-2 border-[#00854B] px-3 py-2 bg-[#00854B]/10">
                {postMatchNotice}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-[10px] font-black font-mono text-black">Report an opponent</div>
              <p className="text-[9px] font-mono text-gray-600 leading-snug">
                Reports are sent to admins. Use &quot;Other&quot; for anything that does not fit the list and add details.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[9px] font-black font-mono text-gray-500">Player</span>
                  <select
                    value={reportTargetValue}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    className={inputCls + " mt-0.5"}
                  >
                    {opponentPlayers.map((p) => (
                      <option key={p.userId} value={p.userId}>
                        {p.ign || p.username || p.userId}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[9px] font-black font-mono text-gray-500">Category</span>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as ReportPlayerBody["category"])}
                    className={inputCls + " mt-0.5"}
                  >
                    {REPORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-[9px] font-black font-mono text-gray-500">
                  Details {reportCategory === "other" ? "(required)" : "(optional)"}
                </span>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  className={inputCls + " mt-0.5 resize-y min-h-[72px]"}
                  placeholder={
                    reportCategory === "other"
                      ? "Describe what happened (required for Other)…"
                      : "Extra context for moderators…"
                  }
                />
              </label>
              <button
                type="button"
                disabled={reportPlayer.isPending || !reportTargetValue}
                onClick={() => {
                  if (!reportTargetValue) return setError("Choose a player to report.");
                  if (reportCategory === "other" && reportDetails.trim().length < 4) {
                    return setError('Add at least 4 characters for category "Other".');
                  }
                  setError("");
                  setPostMatchNotice("");
                  reportPlayer.mutate({
                    challengeId,
                    data: {
                      reportedUserId: reportTargetValue,
                      category: reportCategory,
                      details: reportDetails.trim() ? reportDetails.trim() : null,
                    },
                  });
                }}
                className="btn-brutal w-full py-2.5 text-xs bg-black text-[#FFE600] disabled:opacity-50"
              >
                {reportPlayer.isPending ? "SENDING…" : "SUBMIT REPORT"}
              </button>
            </div>

            <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#FF6B00]" />
                <span className="text-[10px] font-black font-mono text-black">Rematch</span>
              </div>
              <p className="text-[9px] font-mono text-gray-600 leading-snug">
                Opens a new challenge with the same mode and rules; you become the host (Team A). Pick a new time — your previous team name is used unless you change it.
              </p>
              <input
                type="datetime-local"
                value={rematchAt}
                onChange={(e) => setRematchAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={inputCls}
              />
              <input
                type="text"
                value={rematchTeamName}
                onChange={(e) => setRematchTeamName(e.target.value)}
                className={inputCls}
                placeholder="Your team name (optional)"
              />
              <button
                type="button"
                disabled={rematchMut.isPending || !rematchAt}
                onClick={() => {
                  if (!rematchAt) return setError("Pick a date and time for the rematch.");
                  setError("");
                  rematchMut.mutate({
                    challengeId,
                    data: {
                      scheduledAt: new Date(rematchAt).toISOString(),
                      teamName: rematchTeamName.trim() ? rematchTeamName.trim() : null,
                    },
                  });
                }}
                className="btn-brutal w-full py-2.5 text-sm bg-[#FF6B00] text-white disabled:opacity-50"
              >
                {rematchMut.isPending ? "CREATING…" : "CREATE REMATCH CHALLENGE"}
              </button>
            </div>
          </div>
        )}

        {/* Chat — only shown when both teams have joined */}
        {showChat ? (
          <div className="card-brutal overflow-hidden">
            <div className="bg-black px-4 py-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#FFE600]" />
              <span className="text-[#FFE600] text-xs font-black font-mono tracking-widest">TEAM CHAT</span>
              <span className="ml-auto tag-orange">ALL PLAYERS</span>
            </div>
            <div className="bg-white p-4 space-y-3 max-h-52 overflow-y-auto">
              {messages.isLoading ? (
                <div className="text-center text-xs font-mono text-gray-500">Loading messages...</div>
              ) : messages.data?.length === 0 ? (
                <div className="text-center text-xs font-mono text-gray-500 py-4 border-2 border-dashed border-gray-200">
                  No messages yet. Say hi to your opponents.
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
            {inChallenge ? (
              <div className="flex gap-0 border-t-2 border-black">
                <input
                  type="text"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && msgText.trim()) { sendMsg.mutate({ challengeId, data: { content: msgText } }); } }}
                  placeholder="Send a message..."
                  className="flex-1 px-3 py-2.5 bg-white border-r-2 border-black text-sm font-bold text-black focus:outline-none placeholder:font-normal placeholder:text-gray-400"
                />
                <button
                  onClick={() => msgText.trim() && sendMsg.mutate({ challengeId, data: { content: msgText } })}
                  disabled={!msgText.trim() || sendMsg.isPending}
                  className="px-4 py-2.5 bg-[#FF6B00] text-white hover:bg-[#e05f00] transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        ) : inChallenge && !bothTeamsJoined ? (
          <div className="card-brutal-sm bg-white p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <div className="text-xs font-black text-black">TEAM CHAT UNLOCKS WHEN BOTH TEAMS JOIN</div>
            <div className="flex gap-1 justify-center mt-2">
              <div className="flex items-center gap-1 text-[9px] font-mono text-gray-600">
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
