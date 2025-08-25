import type { Metadata } from "next";
import { AuthForm } from "@/components/forms";

// Add metadata for the page
export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password to regain access to your account.",
};

export default function ForgotPassword() {
  return <AuthForm type="forgot-password" />;
}
