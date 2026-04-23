import MetricDetailClient from "./MetricDetailClient";

// Pre-generate HTML for the known static metric slugs at build time.
// User-specific slugs (adherence-med-N, symptom names) are reached via
// client-side SPA navigation and do not need static pre-generation.
export function generateStaticParams() {
  return [
    { metric: "sleep" },
    { metric: "water" },
    { metric: "smoked" },
    { metric: "alcohol" },
    { metric: "adherence-overall" },
  ];
}

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ metric: string }>;
}) {
  const { metric } = await params;
  return <MetricDetailClient metricKey={metric} />;
}
