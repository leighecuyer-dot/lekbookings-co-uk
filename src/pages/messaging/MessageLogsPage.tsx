import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { MessageLogsPanel } from "@/components/messaging/MessageLogsPanel";

export default function MessageLogsPage() {
  const { currentBusiness } = useBusiness();

  if (!currentBusiness) {
    return null;
  }

  return (
    <DashboardLayout
      title="Message History"
      description="View all sent messages and their delivery status"
    >
      <MessageLogsPanel businessId={currentBusiness.id} />
    </DashboardLayout>
  );
}
