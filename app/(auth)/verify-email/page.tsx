import { AuthForm } from "@/components/forms";
import { Metadata } from "next";

// Add metadata for the page
export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to access your account.",
};

export default function VerifyEmailPage() {
  return <AuthForm type="verify-email" />;
}
