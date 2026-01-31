import {
  Scissors,
  Sparkles,
  Heart,
  Stethoscope,
  Dumbbell,
  GraduationCap,
  Camera,
  Palette,
  PawPrint,
  Home,
  Car,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps industry IDs to their corresponding Lucide icons
 * Used for dynamic icon display based on business type
 */
export const industryIconMap: Record<string, LucideIcon> = {
  // Beauty & Grooming
  hair_salon: Scissors,
  barbershop: Scissors,
  nail_salon: Sparkles,
  
  // Wellness & Spa
  spa: Sparkles,
  massage: Heart,
  med_spa: Stethoscope,
  
  // Medical
  dental: Stethoscope,
  medical: Stethoscope,
  
  // Fitness & Wellness
  fitness: Dumbbell,
  yoga: Dumbbell,
  
  // Professional Services
  consulting: Briefcase,
  education: GraduationCap,
  
  // Creative
  photography: Camera,
  tattoo: Palette,
  
  // Other Services
  pet_grooming: PawPrint,
  home_services: Home,
  automotive: Car,
  
  // Default
  other: Briefcase,
};

/**
 * Get the appropriate icon for a business industry
 * @param industry - The industry ID string
 * @returns The corresponding Lucide icon component, defaults to Scissors
 */
export function getIndustryIcon(industry: string | null | undefined): LucideIcon {
  if (!industry) return Scissors;
  return industryIconMap[industry] || Scissors;
}

/**
 * Get a service-specific icon label for the industry
 * @param industry - The industry ID string
 * @returns A descriptive label for what "services" are called in this industry
 */
export function getServiceLabel(industry: string | null | undefined): string {
  const labels: Record<string, string> = {
    hair_salon: "Treatment",
    barbershop: "Service",
    nail_salon: "Treatment",
    spa: "Treatment",
    massage: "Therapy",
    med_spa: "Procedure",
    dental: "Procedure",
    medical: "Appointment",
    fitness: "Session",
    yoga: "Class",
    consulting: "Session",
    education: "Lesson",
    photography: "Session",
    tattoo: "Design",
    pet_grooming: "Groom",
    home_services: "Service",
    automotive: "Service",
  };
  
  return labels[industry || ""] || "Service";
}
