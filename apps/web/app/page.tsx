import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="flex flex-col items-center justify-center p-24">
        <h1 className="text-5xl font-bold tracking-tight">Veritas</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md text-center">
          Trustless AI verdict primitive for the Somnia Agentic L1
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl w-full">
          <Link
            href="/markets"
            className="rounded-xl border bg-card p-8 hover:border-primary/50 transition-colors"
          >
            <h2 className="text-xl font-semibold">Prediction Markets</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Stake on outcomes, resolved by AI consensus
            </p>
          </Link>
          <Link
            href="/insurance"
            className="rounded-xl border bg-card p-8 hover:border-primary/50 transition-colors"
          >
            <h2 className="text-xl font-semibold">Insurance Vault</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Parametric policies that pay out automatically
            </p>
          </Link>
          <Link
            href="/disputes"
            className="rounded-xl border bg-card p-8 hover:border-primary/50 transition-colors"
          >
            <h2 className="text-xl font-semibold">Dispute Resolver</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-judged DAO dispute resolution
            </p>
          </Link>
          <Link
            href="/status"
            className="rounded-xl border bg-card p-8 hover:border-primary/50 transition-colors"
          >
            <h2 className="text-xl font-semibold">System Status</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Monitor all verdicts across every vertical
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
