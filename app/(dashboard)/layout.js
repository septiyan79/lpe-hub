import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({ children }) {
  const session = await auth();

  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session.user} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:px-10">
        {children}
      </main>
    </div>
  );
}
