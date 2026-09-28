"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Users, TrendingUp, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                <Image src="/images/Login-bg.png" alt="CyberVilla" fill sizes="40px" className="object-cover" priority />
              </span>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Cyber<span className="text-brand-gradient">Villa</span> Affiliates
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/signin"
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-accent transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-gradient rounded-xl hover:opacity-95 transition"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Earn Commissions Promoting{" "}
              <span className="text-brand-gradient">Premium Products</span>
            </h1>
            <p className="text-lg text-muted mb-10 max-w-2xl mx-auto">
              Join the CyberVilla affiliate program and earn competitive markup commissions on every sale. 
              Track your performance, generate referral links, and grow your income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold text-white bg-brand-gradient rounded-xl hover:opacity-95 transition shadow-lg"
              >
                Start Earning <ArrowRight size={20} />
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-foreground bg-surface border border-border rounded-xl hover:bg-surface-2 transition"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
            <FeatureCard
              icon={<TrendingUp size={24} className="text-accent" />}
              title="Competitive Commissions"
              description="Earn attractive markup rates on every product sale you generate."
            />
            <FeatureCard
              icon={<Users size={24} className="text-accent" />}
              title="Real-Time Tracking"
              description="Monitor your clicks, conversions, and earnings with detailed analytics."
            />
            <FeatureCard
              icon={<Zap size={24} className="text-accent" />}
              title="Easy Link Generation"
              description="Create unique referral links for any product in our catalog instantly."
            />
            <FeatureCard
              icon={<Shield size={24} className="text-accent" />}
              title="Reliable Payouts"
              description="Get paid on time with transparent payout schedules and reporting."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted">
            © {new Date().getFullYear()} CyberVilla. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 hover:border-accent/50 transition">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
