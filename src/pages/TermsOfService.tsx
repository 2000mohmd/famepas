import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

// Same layout as PrivacyPolicy. Plain text sections; edit the copy here.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. About FamePass",
    body: [
      "FamePass connects venues (restaurants, bars, hotels, shops, experiences and similar businesses) with content creators. Venues publish offers and invitations; creators apply, visit, and publish content about their experience.",
      "FamePass provides the platform only. Each collaboration is an arrangement between the venue and the creator. FamePass is not a party to it and is not the employer, agent or representative of either side.",
    ],
  },
  {
    title: "2. Eligibility and Accounts",
    body: [
      "You must be at least 18 years old and able to enter into a binding agreement to use FamePass. If you register on behalf of a business, you confirm you are authorised to bind that business.",
      "The information you give us must be accurate and kept up to date. You are responsible for keeping your login details secure and for everything done through your account. Tell us immediately at info@famepass.app if you think your account has been used without permission.",
      "Every creator and venue account is reviewed before it is activated. We may approve, decline or later remove any account at our discretion.",
    ],
  },
  {
    title: "3. Creator Commitments",
    body: [
      "When you apply to an offer or accept an invitation, you commit to attend at the agreed time, follow the venue's reasonable instructions while on site, and publish the agreed content within the agreed deadline. If you can't attend, cancel in the app as early as possible.",
      "Your content must be your own original work, must honestly reflect your experience, and must clearly disclose that it is a collaboration (for example with #ad, #gifted or the platform's paid-partnership label) as required by law and by the rules of the platform you post on.",
      "Your audience must be genuine. Buying followers, likes or engagement, or misrepresenting your audience in any way, is not allowed. Follower and engagement figures shown on FamePass come from accounts you connect, and we may suspend creators whose figures turn out to be misleading.",
      "Repeated no-shows, late or missing content, or poor conduct at a venue may lower your score, limit your access to offers, or lead to suspension.",
    ],
  },
  {
    title: "4. Venue Commitments",
    body: [
      "Offers must be described accurately, including what the creator receives, any conditions, and the content you expect. You must honour offers and invitations that a creator has been approved for, and treat creators with respect and in a safe environment.",
      "You may not ask creators to post anything false or misleading, to hide that the content is a collaboration, or to break the law or the rules of the platform they post on.",
      "You are responsible for the products, services and premises you provide, including any licences, permits, health and safety obligations, and age restrictions (for example on alcohol).",
    ],
  },
  {
    title: "5. Content and Licence",
    body: [
      "Creators keep ownership of the content they create. By submitting content for a collaboration through FamePass, the creator grants the venue a non-exclusive, royalty-free licence to reshare that content on the venue's own social-media accounts and website, with credit to the creator, for 12 months from the date it is published, unless the creator and venue agree otherwise in writing.",
      "You grant FamePass a non-exclusive licence to display your profile, public content and collaboration results on the platform, and to use them to promote FamePass, for as long as your account is active.",
      "You confirm you have the rights needed for anything you upload, including permission from any person who appears in it.",
    ],
  },
  {
    title: "6. Points, Rewards and Fees",
    body: [
      "Points, badges, scores and rewards on FamePass have no cash value, cannot be transferred or sold, and may be changed, adjusted or withdrawn by FamePass, for example where they were earned through misuse or by mistake.",
      "Any fees for venues are agreed separately in writing. Unless agreed otherwise, FamePass does not handle payments between venues and creators.",
    ],
  },
  {
    title: "7. Acceptable Use",
    body: [
      "You must not: use FamePass for anything unlawful; harass, threaten or discriminate against anyone; create fake or duplicate accounts; impersonate anyone; scrape, copy or resell data from the platform; try to access accounts or data that aren't yours; interfere with the platform's security or operation; or arrange collaborations found on FamePass outside the platform to avoid its rules.",
    ],
  },
  {
    title: "8. Connected Accounts and Third-Party Services",
    body: [
      "You may connect social-media accounts such as Instagram or TikTok, including through our data partner Phyllo. Connected services are governed by their own terms and privacy policies, and FamePass is not responsible for them. How we handle data from connected accounts is described in our Privacy Policy.",
    ],
  },
  {
    title: "9. Suspension and Termination",
    body: [
      "We may suspend or close an account, remove content, or cancel bookings if we reasonably believe these Terms have been broken, if required by law, or to protect users, venues or FamePass.",
      "You may close your account at any time by contacting info@famepass.app. Commitments you made before closing (for example content you agreed to publish) and the licences in section 5 for content already published continue to apply.",
    ],
  },
  {
    title: "10. Disclaimers",
    body: [
      "FamePass is provided \"as is\" and \"as available\". We do not guarantee that the platform will be uninterrupted or error-free, that any creator or venue will perform as expected, or any particular reach, engagement, sales or other result from a collaboration.",
      "We review accounts but cannot verify everything users tell us. You are responsible for your own judgement and safety when meeting and working with other users.",
    ],
  },
  {
    title: "11. Limitation of Liability",
    body: [
      "To the extent permitted by law, FamePass is not liable for indirect, incidental or consequential losses, lost profits or lost data, or for the acts or omissions of venues, creators or third-party services. Our total liability to you for any claim relating to FamePass is limited to the amount, if any, you paid FamePass in the 12 months before the claim.",
      "Nothing in these Terms limits liability that cannot be limited under applicable law.",
    ],
  },
  {
    title: "12. Indemnity",
    body: [
      "You agree to compensate FamePass for claims, losses and costs (including reasonable legal fees) arising from your content, your collaborations, or your breach of these Terms or the law.",
    ],
  },
  {
    title: "13. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. The new version will be published on this page with a revised \"Last Updated\" date, and for significant changes we will notify you in the app or by email. Continuing to use FamePass after a change means you accept the updated Terms.",
    ],
  },
  {
    title: "14. Governing Law",
    body: [
      "These Terms are governed by the laws of Lebanon. Any dispute will be submitted to the competent courts of Beirut, unless applicable law requires otherwise.",
    ],
  },
  {
    title: "15. Contact Us",
    body: ["Questions about these Terms: info@famepass.app · www.famepass.app"],
  },
];

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/welcome"><BrandLogo tone="gold" size={22} /></Link>
        <Link to="/login" className="text-sm font-medium text-foreground hover:underline">Sign in</Link>
      </div>
    </header>
    <div className="pt-12 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">FamePass Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last Updated: October 2026</p>

        <div className="max-w-none space-y-8 text-muted-foreground">
          <p>
            These Terms of Service ("Terms") govern your use of the FamePass website, application and related services.
            By creating an account or using FamePass you agree to these Terms and to our{" "}
            <Link to="/legal/privacy-policy" className="underline text-foreground">Privacy Policy</Link>.
          </p>
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-foreground">{s.title}</h2>
              {s.body.map((p, i) => <p key={i}>{p}</p>)}
            </section>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default TermsOfService;
