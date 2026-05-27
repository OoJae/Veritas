"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const links = [
  { href: "/markets", label: "Markets" },
  { href: "/insurance", label: "Insurance" },
  { href: "/disputes", label: "Disputes" },
  { href: "/status", label: "Status" },
];

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Veritas
            </Link>
            <div className="hidden sm:flex gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="address"
          />
        </div>
      </div>
    </nav>
  );
}
