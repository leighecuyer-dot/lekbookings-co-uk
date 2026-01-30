import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WaitlistManagement } from "@/components/waitlist/WaitlistManagement";

export default function WaitlistPage() {
  return (
    <DashboardLayout
      title="Waitlist"
      description="Manage customers waiting for popular appointment slots"
    >
      <WaitlistManagement />
    </DashboardLayout>
  );
}
