import { Header } from "@/components/layout/header";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  );
}
