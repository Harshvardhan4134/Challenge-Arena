import { useLocation } from "wouter";

export default function TermsAndConditions() {
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
        <h1 className="display-font text-5xl mb-4">TERMS & CONDITIONS</h1>
        <p className="text-sm font-mono mb-6">Last updated: April 2026</p>

        <div className="space-y-5 text-sm leading-relaxed">
          <section>
            <h2 className="font-black mb-2">1. ACCEPTANCE</h2>
            <p>
              By using Challenge Arena, you agree to these Terms. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">2. PLATFORM PURPOSE</h2>
            <p>
              Challenge Arena is a coordination platform for custom Free Fire matches. We are not affiliated with
              Garena and do not guarantee match outcomes, player behavior, or network stability.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">3. ACCOUNT RESPONSIBILITY</h2>
            <p>
              You are responsible for your account credentials and profile accuracy, including your Free Fire UID.
              Impersonation, abuse, cheating, and fraudulent result submissions are prohibited.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">4. MATCH RULES & DISPUTES</h2>
            <p>
              Challenge creators define match rules. Both teams are expected to submit truthful results.
              Disputed matches may be excluded from stats and leaderboard outcomes pending review.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">5. CONTENT AND COMMUNICATION</h2>
            <p>
              Leader and team communication must remain lawful and respectful. We may suspend accounts for spam,
              harassment, hate speech, scams, or other harmful conduct.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">6. LIMITATION OF LIABILITY</h2>
            <p>
              The service is provided on an "as-is" basis. To the maximum extent permitted by law, Challenge Arena
              is not liable for indirect, incidental, or consequential damages from platform use.
            </p>
          </section>

          <section>
            <h2 className="font-black mb-2">7. CONTACT</h2>
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
