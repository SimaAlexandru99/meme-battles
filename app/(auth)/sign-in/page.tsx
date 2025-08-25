import type { Metadata } from "next";
import { AuthForm } from "@/components/forms";

// Add metadata for the page
export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Access your account to simplify complex code and get clear explanations.",
};

export default function SignIn() {
  return <AuthForm type="sign-in" />;
}
