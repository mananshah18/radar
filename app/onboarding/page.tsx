import { redirect } from "next/navigation";

// Onboarding removed — new users are handled via the home page modal
export default function OnboardingPage() {
  redirect("/");
}
