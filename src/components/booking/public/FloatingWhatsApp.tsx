import { MessageCircle } from "lucide-react";

interface FloatingWhatsAppProps {
  phoneNumber: string;
  businessName?: string;
}

export function FloatingWhatsApp({ phoneNumber, businessName }: FloatingWhatsAppProps) {
  const getWhatsAppUrl = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    const message = businessName 
      ? `Hi! I'm interested in booking with ${businessName}.`
      : "Hi! I'm interested in booking an appointment.";
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  };

  return (
    <a
      href={getWhatsAppUrl(phoneNumber)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#128C7E] hover:scale-105 transition-all duration-200 group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 fill-current" />
      <span className="font-medium text-sm hidden sm:inline group-hover:inline">
        Chat with us
      </span>
    </a>
  );
}
