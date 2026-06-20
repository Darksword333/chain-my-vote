import SingleBallotPageClient from "./SingleBallotPageClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  // Return a dummy path so that Next.js static export compiles the route successfully.
  // Dynamic parameters will be resolved client-side at runtime.
  return [
    { contractAddress: "0x0000000000000000000000000000000000000000" }
  ];
}

export default function Page() {
  return <SingleBallotPageClient />;
}
