import { RouteGuard } from "@/components/route-guard";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allow={["CUSTOMER", "ORGANIZER", "GATE_STAFF"]}>
      <div className="flex flex-1 flex-col">{children}</div>
    </RouteGuard>
  );
}
