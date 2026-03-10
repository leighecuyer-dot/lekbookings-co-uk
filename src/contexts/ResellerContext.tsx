import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Reseller {
  id: string;
  user_id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  markup_percentage: number;
  is_active: boolean;
  settings: Record<string, unknown>;
}

interface ResellerClient {
  id: string;
  reseller_id: string;
  business_id: string;
  subscription_tier: string;
  monthly_price: number;
  is_active: boolean;
  created_at: string;
  business?: {
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface ResellerContextType {
  reseller: Reseller | null;
  clients: ResellerClient[];
  isReseller: boolean;
  needsOnboarding: boolean;
  loading: boolean;
  refreshReseller: () => Promise<void>;
  refreshClients: () => Promise<void>;
}

const ResellerContext = createContext<ResellerContextType | undefined>(undefined);

export function ResellerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [clients, setClients] = useState<ResellerClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReseller = async () => {
    if (!user) {
      setReseller(null);
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("resellers")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching reseller:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setReseller({
        ...data,
        settings: (data.settings as Record<string, unknown>) || {},
        markup_percentage: Number(data.markup_percentage) || 0,
      });
    } else {
      setReseller(null);
    }

    setLoading(false);
  };

  const fetchClients = async () => {
    if (!reseller) {
      setClients([]);
      return;
    }

    const { data, error } = await supabase
      .from("reseller_clients")
      .select(`
        *,
        business:businesses(id, name, slug, industry, email, phone)
      `)
      .eq("reseller_id", reseller.id);

    if (error) {
      console.error("Error fetching clients:", error);
      return;
    }

    setClients((data || []).map((c) => ({
      ...c,
      monthly_price: Number(c.monthly_price) || 0,
      business: c.business as ResellerClient["business"],
    })));
  };

  useEffect(() => {
    fetchReseller();
  }, [user]);

  useEffect(() => {
    if (reseller) {
      fetchClients();
    }
  }, [reseller]);

  // Onboarding is optional — skip logo requirement for now
  const needsOnboarding = false;

  return (
    <ResellerContext.Provider
      value={{
        reseller,
        clients,
        isReseller: !!reseller,
        needsOnboarding,
        loading,
        refreshReseller: fetchReseller,
        refreshClients: fetchClients,
      }}
    >
      {children}
    </ResellerContext.Provider>
  );
}

export function useReseller() {
  const context = useContext(ResellerContext);
  if (context === undefined) {
    throw new Error("useReseller must be used within a ResellerProvider");
  }
  return context;
}
