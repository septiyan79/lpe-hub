import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";

export const metadata = { title: "Kelola User - LPE Portal" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/");

  return <UserManagement currentUserId={session.user.id} />;
}
