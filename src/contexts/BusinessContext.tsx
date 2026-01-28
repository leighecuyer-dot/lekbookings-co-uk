import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface UserRole {
  id: string;
  business_id: string;
  role: "owner" | "admin" | "staff" | "readonly";
}

interface ResellerClient {
  id: string;
  business_id: string;
  reseller_id: string;
  business: Business;
}

export type BusinessMode = "business" | "reseller";

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  currentRole: UserRole | null;
  businessId: string | null;
  mode: BusinessMode;
  isResellerMode: boolean;
  resellerClientBusinesses: Business[];
  loading: boolean;
  isRealtimeActive: boolean;
  setCurrentBusiness: (business: Business | null) => void;
  enterResellerMode: (businessId: string) => void;
  exitResellerMode: () => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [resellerClientBusinesses, setResellerClientBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [mode, setMode] = useState<BusinessMode>("business");
  const [loading, setLoading] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const isResellerMode = mode === "reseller";
  const businessId = currentBusiness?.id ?? null;

  const fetchBusinesses = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setResellerClientBusinesses([]);
      setCurrentBusinessState(null);
      setCurrentRole(null);
      setMode("business");
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Get user's roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      setLoading(false);
      return;
    }

    // Also fetch reseller client businesses if user is a reseller
    const { data: resellerData } = await supabase
      .from("resellers")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    let clientBusinesses: Business[] = [];
    if (resellerData) {
      const { data: clients } = await supabase
        .from("reseller_clients")
        .select("business_id, business:businesses(*)")
        .eq("reseller_id", resellerData.id);

      if (clients) {
        clientBusinesses = clients
          .map(c => c.business as unknown as Business)
          .filter(Boolean);
      }
    }
    setResellerClientBusinesses(clientBusinesses);

    if (!roles || roles.length === 0) {
      setBusinesses([]);
      setCurrentBusinessState(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    // Get businesses for those roles
    const businessIds = roles.map((r) => r.business_id);
    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .in("id", businessIds);

    if (businessError) {
      console.error("Error fetching businesses:", businessError);
      setLoading(false);
      return;
    }

    const typedBusinesses = (businessData || []).map((b) => ({
      ...b,
      settings: (b.settings as Record<string, unknown>) || {},
    })) as Business[];

    setBusinesses(typedBusinesses);

    // Set first business as current if none selected and not in reseller mode
    if (typedBusinesses.length > 0 && !currentBusiness && mode !== "reseller") {
      setCurrentBusinessState(typedBusinesses[0]);
      const role = roles.find((r) => r.business_id === typedBusinesses[0].id);
      if (role) {
        setCurrentRole(role as UserRole);
      }
    }

    setLoading(false);
  }, [user, currentBusiness, mode]);

  // Enter reseller mode to manage a client business
  const enterResellerMode = useCallback((targetBusinessId: string) => {
    const clientBusiness = resellerClientBusinesses.find(b => b.id === targetBusinessId);
    if (clientBusiness) {
      setMode("reseller");
      setCurrentBusinessState(clientBusiness);
      setCurrentRole(null); // Resellers don't have user_roles for client businesses
    }
  }, [resellerClientBusinesses]);

  // Exit reseller mode and return to own businesses
  const exitResellerMode = useCallback(() => {
    setMode("business");
    // Restore to user's own first business
    if (businesses.length > 0) {
      setCurrentBusinessState(businesses[0]);
    } else {
      setCurrentBusinessState(null);
    }
  }, [businesses]);

  const setCurrentBusiness = useCallback((business: Business | null) => {
    setCurrentBusinessState(business);
    // If setting to a user's own business, ensure we're in business mode
    if (business && businesses.some(b => b.id === business.id)) {
      setMode("business");
    }
  }, [businesses]);

  useEffect(() => {
    fetchBusinesses();
  }, [user]);

  // Subscribe to realtime changes for the current business settings
  useEffect(() => {
    if (!currentBusiness) {
      setIsRealtimeActive(false);
      return;
    }

    const channel = supabase
      .channel(`business-settings-${currentBusiness.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${currentBusiness.id}`,
        },
        (payload) => {
          // Update the current business with new settings
          const updatedBusiness = {
            ...payload.new,
            settings: (payload.new.settings as Record<string, unknown>) || {},
          } as Business;
          
          setCurrentBusinessState(updatedBusiness);
          setBusinesses(prev => 
            prev.map(b => b.id === updatedBusiness.id ? updatedBusiness : b)
          );
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      setIsRealtimeActive(false);
      supabase.removeChannel(channel);
    };
  }, [currentBusiness?.id]);

  // Fetch current role when business changes (only in business mode)
  useEffect(() => {
    if (currentBusiness && user && mode === "business") {
      supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("business_id", currentBusiness.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setCurrentRole(data as UserRole);
          }
        });
    } else if (mode === "reseller") {
      setCurrentRole(null);
    }
  }, [currentBusiness, user, mode]);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentBusiness,
        currentRole,
        businessId,
        mode,
        isResellerMode,
        resellerClientBusinesses,
        loading,
        isRealtimeActive,
        setCurrentBusiness,
        enterResellerMode,
        exitResellerMode,
        refreshBusinesses: fetchBusinesses,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
