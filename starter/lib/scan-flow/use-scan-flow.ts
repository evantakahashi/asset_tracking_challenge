"use client";
import { useReducer } from "react";
import type { Asset, Location } from "../types";

export type ScanFlowStatus =
  | "idle"
  | "asset_scanned"
  | "ready_to_commit"
  | "committing";

export type ScanFlowState = {
  status: ScanFlowStatus;
  asset: Asset | null;
  location: Location | null;
  badge: string | null;
  lastReceipt: Asset | null;
  error: { code: string; message: string } | null;
};

export type ScanFlowAction =
  | { type: "ASSET_FETCHED"; asset: Asset }
  | { type: "LOCATION_SCANNED"; location: Location }
  | { type: "BADGE_SCANNED"; badge: string }
  | { type: "COMMIT_START" }
  | { type: "COMMIT_SUCCESS"; asset: Asset }
  | { type: "ERROR"; code: string; message: string }
  | { type: "RESET" };

export const initialScanFlow: ScanFlowState = {
  status: "idle",
  asset: null,
  location: null,
  badge: null,
  lastReceipt: null,
  error: null,
};

export function scanFlowReducer(state: ScanFlowState, action: ScanFlowAction): ScanFlowState {
  switch (action.type) {
    case "ASSET_FETCHED":
      return { ...state, status: "asset_scanned", asset: action.asset, error: null };
    case "LOCATION_SCANNED":
      return { ...state, status: "ready_to_commit", location: action.location, error: null };
    case "BADGE_SCANNED":
      return { ...state, status: "ready_to_commit", badge: action.badge, error: null };
    case "COMMIT_START":
      return { ...state, status: "committing", error: null };
    case "COMMIT_SUCCESS":
      return { ...initialScanFlow, lastReceipt: action.asset };
    case "ERROR":
      return { ...state, status: "idle", asset: null, location: null, badge: null, error: { code: action.code, message: action.message } };
    case "RESET":
      return initialScanFlow;
  }
}

export function useScanFlow() {
  return useReducer(scanFlowReducer, initialScanFlow);
}
