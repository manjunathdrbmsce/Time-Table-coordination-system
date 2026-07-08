import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  const session = await auth();
  
  if (!session?.user) {
    // Show landing page for unauthenticated users
    return <LandingPage />;
  }
  
  // Redirect based on role for authenticated users
  switch (session.user.role) {
    case "ADMIN":
      redirect("/admin");
    case "COORDINATOR":
      redirect("/coordinator");
    case "HOD":
      redirect("/hod");
    default:
      redirect("/login");
  }
}
