"use client";



import Link from "next/link";

import { motion } from "framer-motion";

import { Logo } from "@/components/brand/Logo";

import { BRAND } from "@/lib/constants";

import { Gift, Shield, Zap, Trophy, Sparkles } from "lucide-react";



interface AuthShellProps {

  children: React.ReactNode;

  title: string;

  subtitle: string;

  footerText: string;

  footerLinkText: string;

  footerLinkHref: string;

  variant?: "login" | "register";

}



const trustItems = [

  { icon: Shield, label: "Secure", desc: "256-bit SSL" },

  { icon: Zap, label: "Fast", desc: "Instant bets" },

  { icon: Trophy, label: "Premium", desc: "Best odds" },

];



export function AuthShell({

  children,

  title,

  subtitle,

  footerText,

  footerLinkText,

  footerLinkHref,

  variant = "login",

}: AuthShellProps) {

  return (

    <div className="relative min-h-screen overflow-x-hidden bg-bestbet-dark">

      {/* Ambient background */}

      <div className="pointer-events-none fixed inset-0">

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,215,0,0.12),transparent_50%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,193,7,0.08),transparent_45%)]" />

        <div

          className="absolute inset-0 opacity-[0.035]"

          style={{

            backgroundImage:

              "linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)",

            backgroundSize: "56px 56px",

          }}

        />

      </div>



      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">

        {/* Left — brand panel */}

        <div className="relative hidden min-h-screen overflow-hidden bg-bestbet-dark-secondary lg:flex lg:w-[48%] xl:w-[52%]">

          <div

            className="absolute inset-0 bg-cover bg-center opacity-20"

            style={{

              backgroundImage:

                "url(/images/hero-stadium-night.jpg)",

            }}

          />

          <div className="absolute inset-0 bg-gradient-to-br from-bestbet-dark via-bestbet-dark/95 to-bestbet-dark-secondary" />

          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-bestbet-yellow/[0.07] blur-3xl" />

          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-bestbet-yellow-secondary/[0.05] blur-3xl" />



          <motion.div

            initial={{ opacity: 0, x: -24 }}

            animate={{ opacity: 1, x: 0 }}

            transition={{ duration: 0.65, ease: "easeOut" }}

            className="relative z-10 flex w-full flex-col justify-center px-12 xl:px-16 py-14"

          >

            <Logo variant="stacked" showSlogan className="mb-12" />



            {variant === "register" ? (

              <motion.div

                initial={{ opacity: 0, y: 16 }}

                animate={{ opacity: 1, y: 0 }}

                transition={{ delay: 0.15 }}

                className="auth-panel-glass mb-10 max-w-md p-8"

              >

                <div className="mb-4 inline-flex rounded-xl bg-bestbet-yellow/10 p-3">

                  <Gift size={32} className="text-bestbet-yellow" />

                </div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-bestbet-yellow-secondary">

                  New Player Offer

                </p>

                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">100% Welcome Bonus</h2>

                <p className="mt-2 sm:mt-3 text-base sm:text-lg font-bold text-bestbet-yellow">Up to GH₵ 500.00</p>

                <p className="mt-2 text-sm leading-relaxed text-bestbet-gray-muted">

                  Double your first deposit and start betting on live football, virtual games, and more.

                </p>

              </motion.div>

            ) : (

              <motion.div

                initial={{ opacity: 0, y: 16 }}

                animate={{ opacity: 1, y: 0 }}

                transition={{ delay: 0.15 }}

                className="mb-10 max-w-lg"

              >

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-bestbet-yellow/20 bg-bestbet-yellow/5 px-3 py-1 text-xs font-semibold text-bestbet-yellow">

                  <Sparkles size={14} />

                  Ghana&apos;s Premium Sportsbook

                </div>

                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white xl:text-5xl">

                  Bet smarter.

                  <span className="block text-bestbet-yellow">Win bigger.</span>

                </h2>

                <p className="mt-4 max-w-md text-base leading-relaxed text-bestbet-gray-muted">

                  Live odds, instant MoMo deposits, and a bet slip built for speed — the BestBet experience.

                </p>

              </motion.div>

            )}



            <div className="grid max-w-md grid-cols-3 gap-3">

              {trustItems.map(({ icon: Icon, label, desc }, i) => (

                <motion.div

                  key={label}

                  initial={{ opacity: 0, y: 12 }}

                  animate={{ opacity: 1, y: 0 }}

                  transition={{ delay: 0.25 + i * 0.08 }}

                  className="auth-trust-chip rounded-xl p-4 text-center"

                >

                  <Icon size={20} className="mx-auto mb-2 text-bestbet-yellow" />

                  <p className="text-sm font-bold text-white">{label}</p>

                  <p className="mt-0.5 text-[10px] text-bestbet-gray-muted">{desc}</p>

                </motion.div>

              ))}

            </div>



            <p className="mt-10 text-sm font-medium text-white/70">{BRAND.slogan}</p>

          </motion.div>

        </div>



        {/* Right — form panel */}

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-12">

          <motion.div

            initial={{ opacity: 0, y: 20 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.5, delay: 0.08 }}

            className="w-full max-w-[480px]"

          >

            {/* Mobile logo */}

            <div className="mb-8 text-center lg:hidden">

              <Logo variant="stacked" showSlogan className="mx-auto" />

            </div>



            <div className="auth-panel-glass overflow-hidden p-6 sm:p-8 md:p-10">

              <div className="auth-panel-accent" aria-hidden="true" />



              <div className="relative mb-8 text-center lg:text-left">

                <div className="mb-5 hidden justify-center lg:flex">

                  <Logo variant="icon" className="opacity-90" />

                </div>

                <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>

                <p className="mt-2 text-sm leading-relaxed text-bestbet-gray-muted">{subtitle}</p>

              </div>



              {children}



              <p className="relative mt-8 text-center text-sm text-bestbet-gray-muted">

                {footerText}{" "}

                <Link

                  href={footerLinkHref}

                  className="font-bold text-bestbet-yellow transition-colors hover:text-bestbet-yellow-secondary hover:underline"

                >

                  {footerLinkText}

                </Link>

              </p>

            </div>



            {/* Mobile trust chips */}

            <div className="mt-6 grid grid-cols-3 gap-2 lg:hidden">

              {trustItems.map(({ icon: Icon, label }) => (

                <div key={label} className="auth-trust-chip rounded-lg px-2 py-3 text-center">

                  <Icon size={16} className="mx-auto mb-1 text-bestbet-yellow" />

                  <p className="text-[10px] font-semibold text-white">{label}</p>

                </div>

              ))}

            </div>

          </motion.div>

        </div>

      </div>

    </div>

  );

}

