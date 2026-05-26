export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Veritas</h1>
      <p className="mt-4 text-lg text-gray-600">
        Trustless AI verdict primitive for the Somnia Agentic L1
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <a
          href="/markets"
          className="rounded-lg border p-6 hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold">Prediction Markets</h2>
          <p className="mt-2 text-sm text-gray-500">
            Stake on outcomes, resolved by AI consensus
          </p>
        </a>
        <a
          href="/insurance"
          className="rounded-lg border p-6 hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold">Insurance Vault</h2>
          <p className="mt-2 text-sm text-gray-500">
            Parametric policies that pay out automatically
          </p>
        </a>
        <a
          href="/disputes"
          className="rounded-lg border p-6 hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold">Dispute Resolver</h2>
          <p className="mt-2 text-sm text-gray-500">
            AI-judged DAO dispute resolution
          </p>
        </a>
      </div>
    </main>
  );
}
