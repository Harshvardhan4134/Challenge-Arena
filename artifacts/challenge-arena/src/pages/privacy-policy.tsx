import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#FFE600] text-black px-4 py-8">
      <div className="max-w-3xl mx-auto card-brutal p-6 sm:p-8">
        <button
          onClick={() => navigate("/")}
          className="btn-brutal px-4 py-2 bg-black text-[#FFE600] text-xs mb-6"
        >
          BACK
        </button>
        <h1 className="display-font text-5xl mb-4">PRIVACY POLICY</h1>
        <p className="text-sm font-mono mb-6">Last updated: April 2026</p>

        <div className="space-y-5 text-sm leading-relaxed">
          <section>
            <h2 className="font-black mb-2">1. INFORMATION WE COLLECT</h2>
            <p>
              Challenge Arena collects account data (username, email, Free Fire UID, IGN, optional gender),
              match activity data, and usage metadata needed to operate matchmaking, leaderboard, and notifications.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">2. HOW WE USE DATA</h2>
            <p>
              We use your data to create your account, coordinate matches, show rankings, send match notifications,
              detect abuse, and improve platform reliability.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">3. DATA SHARING</h2>
            <p>
              We do not sell personal data. Limited data may be processed by infrastructure providers
              (for example cloud hosting, push notifications, or messaging services) only for platform operation.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">4. RETENTION AND SECURITY</h2>
            <p>
              We retain account and match records while your account is active and as required for safety,
              fraud prevention, and legal obligations. We use reasonable technical and organizational safeguards.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">5. YOUR RIGHTS</h2>
            <p>
              You can request account corrections or deletion by contacting support. Some records may be retained
              where required by law or to resolve disputes and prevent abuse.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">6. CONTACT</h2>
            <p>
              Support: <a className="underline font-black" href="mailto:support@lendlly.in">support@lendlly.in</a>
            </p>
            <p>
              Ads & collaborations: <a className="underline font-black" href="mailto:harsh@lendlly.in">harsh@lendlly.in</a>
            </p>
            <p>
              Challenge Arena is not a betting or gambling platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
