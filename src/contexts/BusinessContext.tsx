import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Business {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  logo_url: string | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  settings: Record<string, unknown>;
}

interface UserRole {
  id: string;
  business_id: string;
  role: "owner" | "admin" | "staff" | "readonly";
}

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  currentRole: UserRole | null;
  loading: boolean;
  isRealtimeActive: boolean;
  setCurrentBusiness: (business: Business | null) => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const fetchBusinesses = async () => {
    if (!user) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setCurrentRole(null);
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

    if (!roles || roles.length === 0) {
      setBusinesses([]);
      setCurrentBusiness(null);
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
    }));

    setBusinesses(typedBusinesses);

    // Set first business as current if none selected
    if (typedBusinesses.length > 0 && !currentBusiness) {
      setCurrentBusiness(typedBusinesses[0]);
      const role = roles.find((r) => r.business_id === typedBusinesses[0].id);
      if (role) {
        setCurrentRole(role as UserRole);
      }
    }

    setLoading(false);
  };

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
          
          setCurrentBusiness(updatedBusiness);
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

  useEffect(() => {
    if (currentBusiness && user) {
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
    }
  }, [currentBusiness, user]);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentBusiness,
        currentRole,
        loading,
        isRealtimeActive,
        setCurrentBusiness,
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
