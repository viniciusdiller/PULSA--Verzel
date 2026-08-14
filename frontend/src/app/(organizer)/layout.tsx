import { RouteGuard } from "@/components/route-guard";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allow={["ORGANIZER"]}>
      <div className="flex flex-1 flex-col">{children}</div>
    </RouteGuard>
  );
}
