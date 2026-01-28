/**
 * Diagnostic flag indicating that reseller client creation
 * goes through the secure create_reseller_client_business RPC
 * rather than client-side inserts.
 */
export const CREATES_VIA_RPC = true;

/**
 * This file exports diagnostic flags for the reseller client creation path.
 * The actual creation logic is in ResellerClients.tsx which calls the RPC.
 */
