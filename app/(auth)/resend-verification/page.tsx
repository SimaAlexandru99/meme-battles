import { AuthForm } from "@/components/forms";
import { Metadata } from "next";

// Add metadata for the page
export const metadata: Metadata = {
  title: "Resend Verification",
  description: "Resend verification email to your email address.",
};

export default function ResendVerificationPage() {
  return <AuthForm type="resend-verification" />;
}
