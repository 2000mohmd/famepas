import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  label: string;
  hasDropdown?: boolean;
  onClick?: () => void;
}

export interface ProgramCard {
  image: string;
  category: string;
  title: string;
  onClick?: () => void;
}

export interface PulseFitHeroProps {
  logo?: React.ReactNode;
  navigation?: NavigationItem[];
  ctaButton?: { label: string; onClick: () => void };
  title: string;
  subtitle: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  disclaimer?: string;
  socialProof?: { avatars: string[]; text: string };
  programs?: ProgramCard[];
  className?: string;
  children?: React.ReactNode;
}

export function PulseFitHero({
  logo = "FamePass",
  navigation = [],
  ctaButton,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  disclaimer,
  socialProof,
  programs = [],
  className,
  children,
}: PulseFitHeroProps) {
  return (
    <section
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-[#f7f5f0] text-neutral-900",
        className
      )}
    >
      {/* Soft ambient gold glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-[hsl(var(--gold))]/20 blur-[160px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-[hsl(var(--gold-light))]/25 blur-[180px]" />

      {/* Header */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="font-display text-2xl font-semibold tracking-tight">
          {logo}
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigation.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="group inline-flex items-center gap-1 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900"
            >
              {item.label}
              {item.hasDropdown && (
                <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-y-0.5" />
              )}
            </button>
          ))}
        </nav>

        {ctaButton && (
          <button
            onClick={ctaButton.onClick}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:shadow-md"
          >
            {ctaButton.label}
          </button>
        )}
      </header>

      {/* Main content */}
      {children ? (
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-10">
          {children}
        </div>
      ) : (
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-12 text-center lg:px-10 lg:pt-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-5xl font-display text-5xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg"
          >
            {subtitle}
          </motion.p>

          {(primaryAction || secondaryAction) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className="group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition-all hover:bg-neutral-800 hover:shadow-xl"
                >
                  {primaryAction.label}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--gold))] text-neutral-900 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="rounded-full border border-neutral-300 bg-white/70 px-7 py-3.5 text-sm font-semibold text-neutral-900 backdrop-blur transition-all hover:bg-white"
                >
                  {secondaryAction.label}
                </button>
              )}
            </motion.div>
          )}

          {disclaimer && (
            <p className="mt-4 text-xs text-neutral-500">{disclaimer}</p>
          )}

          {socialProof && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-10 flex items-center justify-center gap-3"
            >
              <div className="flex -space-x-2">
                {socialProof.avatars.map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt=""
                    className="h-8 w-8 rounded-full border-2 border-[#f7f5f0] object-cover"
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-neutral-700">
                {socialProof.text}
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* Program carousel */}
      {programs.length > 0 && (
        <div className="relative mt-4 overflow-hidden pb-16">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#f7f5f0] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#f7f5f0] to-transparent" />

          <motion.div
            className="flex gap-5"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            {[...programs, ...programs].map((program, index) => (
              <button
                key={index}
                onClick={program.onClick}
                className="group relative aspect-[3/4] w-[260px] flex-shrink-0 overflow-hidden rounded-3xl shadow-lg shadow-neutral-900/5 transition-transform hover:-translate-y-1"
              >
                <img
                  src={program.image}
                  alt={program.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                  <span className="inline-block rounded-full bg-[hsl(var(--gold))]/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-900">
                    {program.category}
                  </span>
                  <h3 className="mt-2 font-display text-xl font-medium leading-tight text-white">
                    {program.title}
                  </h3>
                </div>
              </button>
            ))}
          </motion.div>
        </div>
      )}
    </section>
  );
}
