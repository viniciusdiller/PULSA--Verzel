import type { Role } from "@/lib/auth";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  statsCount: number;
  statsLabel: string;
}
