"use client";

import { useEffect, useState } from "react";
import {
  isFeatureEnabled,
  type ModuleFormatMap,
  type SchoolFeatureKey,
} from "@/lib/school-features";
import type { LiveSchoolLetterhead } from "@/lib/certificates/school-brand";

type SchoolFeaturesState = {
  features: SchoolFeatureKey[] | null;
  formats: ModuleFormatMap | null;
  letterhead: LiveSchoolLetterhead | null;
  ready: boolean;
};

let cached: SchoolFeaturesState | null = null;
let inflight: Promise<SchoolFeaturesState> | null = null;

async function loadSchoolFeatures(): Promise<SchoolFeaturesState> {
  if (inflight) return inflight;
  inflight = fetch("/api/school/features", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) {
        const empty: SchoolFeaturesState = {
          features: null,
          formats: null,
          letterhead: null,
          ready: true,
        };
        cached = empty;
        return empty;
      }
      const d = await r.json();
      const next: SchoolFeaturesState = {
        features: Array.isArray(d.features) ? d.features : null,
        formats: d.formats ?? null,
        letterhead: d.letterhead ?? null,
        ready: true,
      };
      cached = next;
      return next;
    })
    .catch(() => {
      const empty: SchoolFeaturesState = {
        features: null,
        formats: null,
        letterhead: null,
        ready: true,
      };
      cached = empty;
      return empty;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

type FeaturesListener = () => void;
const listeners = new Set<FeaturesListener>();

/** Clear cache after Super Admin updates (or after re-login). */
export function invalidateSchoolFeaturesCache() {
  cached = null;
  inflight = null;
  listeners.forEach((fn) => fn());
}

export function useSchoolFeatures() {
  const [state, setState] = useState<SchoolFeaturesState>(
    cached ?? { features: null, formats: null, letterhead: null, ready: false },
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onInvalidate = () => setTick((n) => n + 1);
    listeners.add(onInvalidate);
    return () => {
      listeners.delete(onInvalidate);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    // Force a fresh fetch whenever cache was invalidated
    if (tick > 0) {
      cached = null;
      inflight = null;
    }
    void loadSchoolFeatures().then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  return {
    ...state,
    has: (key: SchoolFeatureKey) =>
      state.features ? isFeatureEnabled(state.features, key) : true,
  };
}
