"use client";

import { useState, useCallback, useEffect } from "react";
import { TierName, TIER_ORDER } from "@/types";

interface SubscriptionData {
  walletAddress: string;
  tier: TierName;
  subscribedAt: string;
}

function getStorageKey(walletAddress: string) {
  return `solgate_sub_${walletAddress}`;
}

function loadSubscription(walletAddress: string): SubscriptionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSubscription(data: SubscriptionData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(data.walletAddress), JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

export function useSubscriptions(walletAddress: string | null) {
  const [subscribedTier, setSubscribedTier] = useState<TierName | null>(null);

  // Load subscription on mount or wallet change
  useEffect(() => {
    if (!walletAddress) {
      setSubscribedTier(null);
      return;
    }
    const sub = loadSubscription(walletAddress);
    if (sub) {
      setSubscribedTier(sub.tier);
    } else {
      setSubscribedTier(null);
    }
  }, [walletAddress]);

  // Subscribe to a tier (called after successful payment)
  const subscribe = useCallback(
    (tierName: TierName) => {
      if (!walletAddress) return;
      // Only upgrade, never downgrade
      if (subscribedTier) {
        const currentIdx = TIER_ORDER.indexOf(subscribedTier);
        const newIdx = TIER_ORDER.indexOf(tierName);
        if (newIdx <= currentIdx) return; // already have this or higher
      }
      const data: SubscriptionData = {
        walletAddress,
        tier: tierName,
        subscribedAt: new Date().toISOString(),
      };
      saveSubscription(data);
      setSubscribedTier(tierName);
    },
    [walletAddress, subscribedTier]
  );

  // Check if user can view content at a given tier
  const canViewTier = useCallback(
    (tierName: TierName): boolean => {
      if (tierName === "free") return true;
      if (!subscribedTier) return false;
      const userIdx = TIER_ORDER.indexOf(subscribedTier);
      const requiredIdx = TIER_ORDER.indexOf(tierName);
      return userIdx >= requiredIdx;
    },
    [subscribedTier]
  );

  return { subscribedTier, subscribe, canViewTier };
}
