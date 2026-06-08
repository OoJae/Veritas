"use client";

// components/navbar.tsx — Veritas-branded replacement.
// Keeps your existing routes + RainbowKit ConnectButton.

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Seal } from "@/components/seal";

const links = [
  { href: "/markets", label: "Markets" },
  { href: "/insurance", label: "Insurance" },
  { href: "/disputes", label: "Disputes" },
  { href: "/status", label: "Status" },
];

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-9">
            <Link href="/" className="flex items-center gap-2.5">
              <Seal size={26} className="text-[var(--verum)]" />
              <span className="font-display text-[17px]">VERITAS</span>
            </Link>
            <div className="hidden sm:flex gap-7">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--verum)] animate-pulse" />
              Somnia Testnet
            </span>
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
          </div>
        </div>
      </div>
    </nav>
  );
}
