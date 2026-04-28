import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminClient from "./Client";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");
  return (
    <main className="space-y-3">
      <h1 className="text-xl font-bold text-yellow-200">管理者画面</h1>
      <AdminClient />
    </main>
  );
}
