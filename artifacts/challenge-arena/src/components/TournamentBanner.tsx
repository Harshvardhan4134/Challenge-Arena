import { Calendar, Instagram, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/** Public BR tournament promo — updates + room on site + Instagram group. */
export const TEAM_GODS_FF_INSTAGRAM =
  "https://www.instagram.com/teamgods_ff?igsh=ZnU4dDJ3dXM3aTFl";

/** Instagram group for on-time updates and tournament coordination. */
export const BR_TOURNAMENT_GROUP_URL = "https://ig.me/j/AbZx-x4s0VS6tqV2/";

export function TournamentBanner({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "card-brutal border-4 border-black bg-white p-3 sm:p-4 shadow-[4px_4px_0_0_#000]",
        className,
      )}
      aria-label="BR tournament announcement"
    >
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <span className="tag-orange text-[10px] sm:text-xs font-black font-mono tracking-widest">
          TOURNAMENT
        </span>
        <span className="tag-black text-[10px] sm:text-xs font-black font-mono tracking-widest">
          BATTLE ROYALE
        </span>
      </div>
      <h2 className="display-font text-xl sm:text-2xl leading-tight text-black mb-2">
        BR TOURNAMENT — WIN ₹100
      </h2>
      <div className="space-y-2 text-xs sm:text-sm font-bold text-black/90 leading-snug">
        <p className="flex gap-2">
          <Trophy className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6B00]" aria-hidden />
          <span>
            Winner receives <span className="font-black">₹100</span>.
          </span>
        </p>
        <p className="flex gap-2">
          <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6B00]" aria-hidden />
          <span>
            <span className="font-black">Live at 2:30 PM IST</span> — custom room ID and password will be shared on this site and in the Instagram group.
          </span>
        </p>
        <div className="pl-0 sm:pl-0 border-l-4 border-black pl-3 py-1 bg-[#FFE600]/40">
          <p className="font-black text-[10px] sm:text-xs uppercase tracking-widest mb-1.5">
            BR room rules
          </p>
          <ul className="list-disc list-inside space-y-1 font-bold text-[11px] sm:text-xs">
            <li>No teaming — solo only</li>
            <li>Individual play only</li>
            <li>Gun attributes off / not allowed</li>
            <li>Fair gameplay required</li>
          </ul>
          <p className="mt-2 text-[11px] sm:text-xs font-bold text-black/85">
            If these rules are broken, that player is not eligible for the prize — the{" "}
            <span className="font-black">next genuine finisher</span> receives the prize money.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
        <a
          href={BR_TOURNAMENT_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-3 py-2 border-2 border-black bg-[#FF6B00] text-white text-xs sm:text-sm font-black font-mono tracking-wide hover:bg-black transition-colors"
        >
          <Users className="w-4 h-4 shrink-0" aria-hidden />
          JOIN GROUP — STAY ON TIME
        </a>
        <a
          href={TEAM_GODS_FF_INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-3 py-2 border-2 border-black bg-[#FFE600] text-black text-xs sm:text-sm font-black font-mono tracking-wide hover:bg-[#FF6B00] hover:text-white transition-colors"
        >
          <Instagram className="w-4 h-4 shrink-0" aria-hidden />
          FOLLOW @TEAMGODS_FF
        </a>
      </div>
    </aside>
  );
}
