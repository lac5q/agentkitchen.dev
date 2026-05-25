import Script from "next/script";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

function normalizeMeasurementId(measurementId?: string): string | null {
  const normalized = measurementId?.trim().toUpperCase();
  return normalized && /^G-[A-Z0-9]+$/.test(normalized) ? normalized : null;
}

export function GoogleAnalyticsTracking({ measurementId = GA_MEASUREMENT_ID }: { measurementId?: string }) {
  const gaId = normalizeMeasurementId(measurementId);
  if (!gaId) return null;

  const serializedGaId = JSON.stringify(gaId);

  return (
    <>
      <Script
        id="google-analytics-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${serializedGaId});
        `}
      </Script>
    </>
  );
}
