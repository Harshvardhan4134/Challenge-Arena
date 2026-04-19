import { Calendar, Instagram, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Public BR tournament promo — room/time announced later on site + Instagram. */
export const TEAM_GODS_FF_INSTAGRAM =
  "https://www.instagram.com/teamgods_ff?igsh=ZnU4dDJ3dXM3aTFl";

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
            Winner receives <span className="font-black">₹100</span>. Stay tuned — date and time will be announced soon.
          </span>
        </p>
        <p className="flex gap-2">
          <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6B00]" aria-hidden />
          <span>
            Custom room ID and password will be shared soon on this website and on Instagram.
          </span>
        </p>
      </div>
      <a
        href={TEAM_GODS_FF_INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-[#FFE600] text-black text-xs sm:text-sm font-black font-mono tracking-wide hover:bg-[#FF6B00] hover:text-white transition-colors"
      >
        <Instagram className="w-4 h-4 shrink-0" aria-hidden />
        FOLLOW @TEAMGODS_FF
      </a>
    </aside>
  );
}
