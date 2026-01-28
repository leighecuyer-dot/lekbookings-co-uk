/**
 * Diagnostic flag indicating that the dashboard uses
 * the optimized get_dashboard_overview RPC function.
 */
export const USES_DASHBOARD_RPC = true;

let lastDashboardRpcTimestamp: number | null = null;

/**
 * Records the timestamp of the last dashboard RPC call.
 * Called from DashboardPage when it fetches data.
 */
export function recordDashboardRpcCall() {
  lastDashboardRpcTimestamp = Date.now();
}

/**
 * Returns the timestamp of the last dashboard RPC call.
 */
export function getLastDashboardRpcTimestamp(): number | null {
  return lastDashboardRpcTimestamp;
}
