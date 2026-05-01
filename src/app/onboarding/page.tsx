import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const role = user.publicMetadata?.role as string | undefined;
  if (role) redirect(`/${role}`);

  const name =
    user.firstName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  return <OnboardingForm name={name} />;
}
