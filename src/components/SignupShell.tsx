import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** Premium two-pane signup layout shared by the venue and creator wizards:
 * photo/brand panel on the left (desktop), light form area on the right. */
const SignupShell = ({ image, title, points, children }: {
  image: string; title: string; points: string[]; children: React.ReactNode;
}) => (
  <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" style={{ background: "#F7F3EE" }}>
    <aside className="hidden lg:flex sticky top-0 h-screen flex-col justify-between p-12 text-white overflow-hidden" style={{ background: "#510000" }}>
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(81,0,0,.55) 0%, rgba(81,0,0,.25) 40%, rgba(40,0,0,.92) 100%)" }} />
      <Link to="/" className="relative"><BrandLogo tone="gold" size={24} /></Link>
      <div className="relative">
        <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.05] text-[#F5EBDD]">{title}</h2>
        <ul className="mt-8 space-y-4">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[#F5EBDD]/90">
              <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#CD9774" }}>
                <Check className="w-4 h-4 text-[#510000]" strokeWidth={3} />
              </span>
              <span className="text-base leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>

    <div className="min-h-screen flex flex-col">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between lg:justify-end">
        <Link to="/" className="lg:hidden"><BrandLogo tone="burgundy" size={20} /></Link>
        <LanguageSwitcher className="!text-neutral-600 hover:!text-neutral-900" />
      </header>
      <main className="flex-1 flex justify-center px-4 sm:px-8 pb-16 pt-2 lg:pt-8">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  </div>
);

export default SignupShell;
