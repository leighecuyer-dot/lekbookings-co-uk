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

let cachedIndustries: Industry[] | null = null;

export function useIndustries() {
  const [industries, setIndustries] = useState<Industry[]>(cachedIndustries || FALLBACK_INDUSTRIES);
  const [loading, setLoading] = useState(!cachedIndustries);

  useEffect(() => {
    if (cachedIndustries) {
      setIndustries(cachedIndustries);
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
      } else {
        cachedIndustries = data;
        setIndustries(data);
      }
      setLoading(false);
    };

    fetchIndustries();
  }, []);

  return { industries, loading };
}
