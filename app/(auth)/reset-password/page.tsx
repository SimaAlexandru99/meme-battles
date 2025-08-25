import type { Metadata } from "next";
import { AuthForm } from "@/components/forms";

// Add metadata for the page
export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password to regain access to your account.",
};

export default function ResetPassword() {
  return <AuthForm type="reset-password" />;
}
