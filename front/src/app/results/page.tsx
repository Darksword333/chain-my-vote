import Link from "next/link";
import WalletStatus from "@/components/ui/wallet-status";

export default function ResultsPage() {
  // Placeholder results — replace with on-chain queries as needed
  const sampleResults = [
    { id: 1, title: "Best Framework", results: ["React: 42", "Vue: 17", "Svelte: 5"] },
  ];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Results</h1>
      </div>

      <div className="space-y-4">
        {sampleResults.map((r) => (
          <div key={r.id} className="border rounded p-4">
            <h2 className="font-semibold">{r.title}</h2>
            <ul className="mt-2 list-disc pl-6">
              {r.results.map((res, i) => (
                <li key={i}>{res}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground">Back to Home</Link>
      </div>
    </div>
  );
}
