import type { Metadata } from "next";
import { AuthForm } from "@/components/forms";

// Add metadata for the page
export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to access your account.",
};

export default function VerifyEmailPage() {
  return <AuthForm type="verify-email" />;
}
