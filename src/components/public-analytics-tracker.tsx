"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type AnalyticsMetadata = Record<string, string | number | boolean | null>;

const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

function shouldTrackPath(pathname: string): boolean {
  return !(
    pathname.startsWith("/api") ||
    pathname.startsWith("/business") ||
    pathname.startsWith("/admin")
  );
}

function sendAnalyticsEvent(
  eventName: string,
  pagePath: string,
  metadata: AnalyticsMetadata = {},
) {
  if (!shouldTrackPath(pagePath)) {
    return;
  }

  const payload = JSON.stringify({
    eventName,
    pagePath,
    metadata,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Les métriques ne doivent jamais gêner la navigation.
  });
}

function readTrackingMetadata(element: HTMLElement): AnalyticsMetadata {
  const metadata: AnalyticsMetadata = {};

  if (element.dataset.analyticsLabel) {
    metadata.label = element.dataset.analyticsLabel;
  }

  if (element.dataset.analyticsTarget) {
    metadata.target = element.dataset.analyticsTarget;
  }

  if (element.dataset.pizzaId) {
    metadata.pizzaId = Number(element.dataset.pizzaId);
  }

  if (element.dataset.pizzaName) {
    metadata.pizzaName = element.dataset.pizzaName;
  }

  if (element.dataset.eventSlug) {
    metadata.eventSlug = element.dataset.eventSlug;
  }

  return metadata;
}

export default function PublicAnalyticsTracker() {
  const pathname = usePathname() || "/";
  const reachedScrollDepthsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!shouldTrackPath(pathname)) {
      return;
    }

    reachedScrollDepthsRef.current = new Set();
    sendAnalyticsEvent("page_view", pathname);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const trackedElement = target.closest<HTMLElement>(
        "[data-analytics-event]",
      );

      if (!trackedElement) {
        return;
      }

      const eventName = trackedElement.dataset.analyticsEvent;

      if (!eventName) {
        return;
      }

      sendAnalyticsEvent(
        eventName,
        window.location.pathname,
        readTrackingMetadata(trackedElement),
      );
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    function handleScroll() {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (scrollableHeight <= 0) {
        return;
      }

      const scrollPercent = Math.min(
        100,
        Math.round((window.scrollY / scrollableHeight) * 100),
      );

      for (const threshold of SCROLL_THRESHOLDS) {
        if (
          scrollPercent >= threshold &&
          !reachedScrollDepthsRef.current.has(threshold)
        ) {
          reachedScrollDepthsRef.current.add(threshold);
          sendAnalyticsEvent("scroll_depth", window.location.pathname, {
            depth: threshold,
          });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
