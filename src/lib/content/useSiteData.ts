"use client";

import { useEffect, useState } from "react";
import { DEFAULT_DATA } from "./defaults";
import { readDemoData } from "./store";
import type { SiteData } from "./types";
import { PUBLIC_WEEGLOO } from "@/lib/weegloo/config";
import { loadPublishedSite } from "@/lib/weegloo/cda";

/** Loads the site content once per page load; bundled copy is shown until it arrives. */
export function useSiteData() {
  const [data, setData] = useState<SiteData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!PUBLIC_WEEGLOO) {
      setData(readDemoData() ?? DEFAULT_DATA);
      setReady(true);
      return;
    }
    loadPublishedSite().then((d) => {
      if (!alive) return;
      setData(d);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { data, ready };
}
