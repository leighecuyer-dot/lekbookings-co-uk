import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Industry {
  id: string;
  label: string;
}

// Fallback industries in case DB fetch fails
const FALLBACK_INDUSTRIES: Industry[] = [
  { id: "hair_salon", label: "Hair Salon" },
  { id: "barbershop", label: "Barbershop" },
  { id: "nail_salon", label: "Nail Salon" },
  { id: "spa", label: "Spa / Wellness" },
  { id: "massage", label: "Massage Therapy" },
  { id: "med_spa", label: "Med Spa / Aesthetics" },
  { id: "dental", label: "Dental Clinic" },
  { id: "medical", label: "Medical Practice" },
  { id: "fitness", label: "Fitness / Personal Training" },
  { id: "yoga", label: "Yoga / Pilates Studio" },
  { id: "consulting", label: "Consulting / Coaching" },
  { id: "education", label: "Tutoring / Education" },
  { id: "photography", label: "Photography Studio" },
  { id: "tattoo", label: "Tattoo / Piercing Studio" },
  { id: "pet_grooming", label: "Pet Grooming" },
  { id: "home_services", label: "Home Services (Cleaning, Repair)" },
  { id: "automotive", label: "Automotive Services" },
  { id: "other", label: "Other" },
];

export type IndustriesSource = "database" | "fallback" | "loading";

let cachedIndustries: Industry[] | null = null;
let cachedSource: IndustriesSource = "loading";

export function useIndustries() {
  const [industries, setIndustries] = useState<Industry[]>(cachedIndustries || FALLBACK_INDUSTRIES);
  const [loading, setLoading] = useState(!cachedIndustries);
  const [source, setSource] = useState<IndustriesSource>(cachedSource);

  useEffect(() => {
    if (cachedIndustries) {
      setIndustries(cachedIndustries);
      setSource(cachedSource);
      setLoading(false);
      return;
    }

    const fetchIndustries = async () => {
      const { data, error } = await supabase
        .from("industries")
        .select("id, label")
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        // Use fallback
        setIndustries(FALLBACK_INDUSTRIES);
        cachedSource = "fallback";
        setSource("fallback");
      } else {
        cachedIndustries = data;
        cachedSource = "database";
        setIndustries(data);
        setSource("database");
      }
      setLoading(false);
    };

    fetchIndustries();
  }, []);

  return { industries, loading, source };
}
