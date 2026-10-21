import * as Network from "expo-network";
import { OfflineError } from "@/lib/care-team";

/** Throws OfflineError when the device reports no connection. */
export async function ensureOnline() {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false || state.isInternetReachable === false) {
      throw new OfflineError();
    }
  } catch (error) {
    if (error instanceof OfflineError) throw error;
    // If the network module itself fails, let the request decide.
  }
}

