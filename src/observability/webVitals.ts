import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

function report(metric: Metric) {
  if (import.meta.env.DEV) {
    console.log("[web-vitals]", metric.name, metric.value);
  }
}

export function initWebVitals() {
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}