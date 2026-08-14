import { RouteGuard } from "@/components/route-guard";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allow={["CUSTOMER"]}>
      <div className="flex flex-1 flex-col">{children}</div>
    </RouteGuard>
  );
}
