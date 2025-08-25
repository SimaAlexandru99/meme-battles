import type { Metadata } from "next";
import { AuthForm } from "@/components/forms";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your account to start simplifying complex code and getting clear explanations.",
};

export default function SignUp() {
  return <AuthForm type="sign-up" />;
}
