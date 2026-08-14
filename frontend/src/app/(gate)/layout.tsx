import { RouteGuard } from "@/components/route-guard";

export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allow={["GATE_STAFF"]}>
      <div className="flex flex-1 flex-col">{children}</div>
    </RouteGuard>
  );
}
