"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { CustomFormField } from "@/components/forms";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  applyActionCode,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";

import {
  signIn,
  signUp,
  signInWithGoogle,
  signInWithGitHub,
} from "@/lib/actions/auth.action";
import { Google } from "@/components/logos";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email:
      type === "reset-password"
        ? z.string().optional()
        : type === "verify-email"
        ? z.string().optional()
        : z.string().email(),
    password:
      type === "forgot-password" ||
      type === "verify-email" ||
      type === "resend-verification"
        ? z.string().optional()
        : z.string().min(3),
    confirmPassword:
      type === "reset-password" ? z.string().min(3) : z.string().optional(),
  });
};

const AuthForm = ({
  type,
  className,
  ...props
}: { type: FormType } & React.ComponentProps<"form">) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch form values to make the component reactive
  const watchedValues = form.watch();

  // Check if form is valid and all required fields are filled
  const isFormValid = () => {
    const isSignIn = type === "sign-in";
    const isForgotPassword = type === "forgot-password";
    const isResetPassword = type === "reset-password";
    const isVerifyEmail = type === "verify-email";
    const isResendVerification = type === "resend-verification";

    if (isSignIn) {
      return (
        watchedValues.email?.trim() !== "" &&
        watchedValues.password?.trim() !== ""
      );
    } else if (isForgotPassword) {
      return watchedValues.email?.trim() !== "";
    } else if (isResetPassword) {
      return (
        watchedValues.password?.trim() !== "" &&
        watchedValues.confirmPassword?.trim() !== ""
      );
    } else if (isVerifyEmail) {
      return true; // No form fields required for email verification
    } else if (isResendVerification) {
      return watchedValues.email?.trim() !== "";
    } else {
      return (
        watchedValues.name?.trim() !== "" &&
        watchedValues.email?.trim() !== "" &&
        watchedValues.password?.trim() !== ""
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const idToken = await result.user.getIdToken();
      const response = await signInWithGoogle(idToken);

      if (response.success) {
        toast.success(response.message);
        router.push("/app/home");
      } else {
        toast.error(response.message);
      }
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);

      if (error && typeof error === "object" && "code" in error) {
        const firebaseError = error as { code: string };

        if (firebaseError.code === "auth/popup-closed-by-user") {
          toast.error("Sign-in cancelled");
        } else if (firebaseError.code === "auth/popup-blocked") {
          toast.error("Popup blocked. Please allow popups and try again.");
        } else {
          toast.error(`Authentication error: ${firebaseError.code}`);
        }
      } else {
        toast.error("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const idToken = await result.user.getIdToken();
      const response = await signInWithGitHub(idToken);

      if (response.success) {
        toast.success(response.message);
        router.push("/app/home");
      } else {
        toast.error(response.message);
      }
    } catch (error: unknown) {
      console.error("GitHub sign-in error:", error);

      // Type guard to check if error is a Firebase Auth error with a code property
      if (error && typeof error === "object" && "code" in error) {
        const firebaseError = error as { code: string };

        if (firebaseError.code === "auth/popup-closed-by-user") {
          toast.error("Sign-in cancelled");
        } else if (firebaseError.code === "auth/popup-blocked") {
          toast.error("Popup blocked. Please allow popups and try again.");
        } else if (
          firebaseError.code === "auth/account-exists-with-different-credential"
        ) {
          toast.error(
            "An account already exists with the same email address but different sign-in credentials."
          );
        } else {
          toast.error(`Authentication error: ${firebaseError.code}`);
        }
      } else {
        toast.error("Failed to sign in with GitHub. Please try again.");
      }
    } finally {
      setIsGithubLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        if (!password) {
          toast.error("Password is required");
          return;
        }

        if (!email) {
          toast.error("Email is required");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Send email verification
        await sendEmailVerification(userCredential.user);

        const result = await signUp({
          uid: userCredential.user.uid,
          name: name || "",
          email,
          password,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(
          "Account created! Please verify your email to verify your account."
        );
        router.push("/verify-email");
      } else if (type === "verify-email") {
        // Get the oobCode from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const oobCode = urlParams.get("oobCode");

        if (!oobCode) {
          toast.error("Invalid verification link");
          return;
        }

        await applyActionCode(auth, oobCode);
        toast.success("Email verified successfully! You can now sign in.");
        router.push("/sign-in");
      } else if (type === "resend-verification") {
        const { email } = data;

        if (!email) {
          toast.error("Email is required");
          return;
        }

        try {
          toast.info(
            "To resend the verification email, please try to sign in with your credentials. If your email is not verified, you will be redirected to verify it."
          );
          router.push("/sign-in");
        } catch (error) {
          console.error("Error:", error);
          toast.error(
            "Cannot resend verification email. Please try to sign in."
          );
          router.push("/sign-in");
        }
      } else if (type === "forgot-password") {
        const { email } = data;

        if (!email) {
          toast.error("Email is required");
          return;
        }

        await sendPasswordResetEmail(auth, email);
        toast.success(
          "Email for password reset has been sent. Please check your inbox."
        );
        router.push("/sign-in");
      } else if (type === "reset-password") {
        const { password, confirmPassword } = data;

        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }

        // Get the oobCode from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const oobCode = urlParams.get("oobCode");

        if (!oobCode) {
          toast.error("Invalid reset link");
          return;
        }

        if (!password) {
          toast.error("Password is required");
          return;
        }

        await confirmPasswordReset(auth, oobCode, password);
        toast.success(
          "Password has been reset successfully. Please sign in with your new password."
        );
        router.push("/sign-in");
      } else {
        const { email, password } = data;

        if (!email) {
          toast.error("Email is required");
          return;
        }

        if (!password) {
          toast.error("Password is required");
          return;
        }

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          // Offer to resend verification email
          await sendEmailVerification(userCredential.user);
          toast.error(
            "Please verify your email before signing in. We have sent a new verification email to your inbox."
          );
          router.push("/verify-email");
          return;
        }

        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          toast.error("Authentication failed. Please try again.");
          return;
        }

        const result = await signIn({
          email,
          idToken,
        });

        if (result?.success) {
          toast.success(result.message);
          router.push("/app/home");
        } else {
          toast.error(result?.message || "Failed to sign in");
        }
      }
    } catch (error) {
      console.log(error);
      toast.error(`An error occurred: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isSignIn = type === "sign-in";
  const isForgotPassword = type === "forgot-password";
  const isResetPassword = type === "reset-password";
  const isVerifyEmail = type === "verify-email";
  const isResendVerification = type === "resend-verification";

  return (
    <div className="flex justify-center items-center w-full">
      <div className="flex flex-col justify-center items-center h-full w-[360px] py-16 md:py-24">
        <div className="relative w-full">
          <div className="flex flex-col gap-6 w-full">
            <header className="flex flex-col gap-1.5 xl:gap-2.5">
              <h1 className="text-xl xl:text-2xl font-semibold text-center">
                {isForgotPassword
                  ? "Reset your password"
                  : isResetPassword
                  ? "Set a new password"
                  : isVerifyEmail
                  ? "Verify your email"
                  : isResendVerification
                  ? "Resend verification email"
                  : isSignIn
                  ? "Log in to your account"
                  : "Create your account"}
              </h1>
            </header>

            {/* Social Login Buttons - only show for sign-in and sign-up */}
            {(isSignIn || type === "sign-up") && (
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-75 focus-ring disabled:pointer-events-auto data-[loading='true']:!text-transparent bg-background border border-gray-alpha-200 hover:bg-gray-alpha-50 active:bg-gray-alpha-50 radix-state-open:bg-gray-alpha-50 hover:border-gray-alpha-300 text-foreground shadow-none active:border-gray-alpha-300 disabled:bg-background disabled:text-gray-300 radix-state-open:border-gray-alpha-300 px-3 h-10 gap-2.5 w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Google className="h-5 w-5" />
                  )}
                  <span>Sign in with Google</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-75 focus-ring disabled:pointer-events-auto data-[loading='true']:!text-transparent bg-background border border-gray-alpha-200 hover:bg-gray-alpha-50 active:bg-gray-alpha-50 radix-state-open:bg-gray-alpha-50 hover:border-gray-alpha-300 text-foreground shadow-none active:border-gray-alpha-300 disabled:bg-background disabled:text-gray-300 radix-state-open:border-gray-alpha-300 px-3 h-10 gap-2.5 w-full"
                  onClick={handleGithubSignIn}
                  disabled={isGithubLoading || isLoading}
                >
                  {isGithubLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Github</title>
                      <g clipPath="url(#clip0_95_589)">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 0.5C5.3724 0.5 0 5.8808 0 12.5204C0 17.8304 3.438 22.3364 8.2068 23.9252C8.8068 24.0356 9.0252 23.6648 9.0252 23.3456C9.0252 23.0612 9.0156 22.304 9.0096 21.302C5.6712 22.028 4.9668 19.6904 4.9668 19.6904C4.422 18.3008 3.6348 17.9312 3.6348 17.9312C2.5452 17.1872 3.7176 17.2016 3.7176 17.2016C4.9212 17.2856 5.5548 18.44 5.5548 18.44C6.6252 20.276 8.364 19.7456 9.0468 19.4384C9.1572 18.662 9.4668 18.1328 9.81 17.8328C7.146 17.5292 4.344 16.4972 4.344 11.8916C4.344 10.58 4.812 9.506 5.5788 8.666C5.4552 8.3624 5.0436 7.1396 5.6964 5.486C5.6964 5.486 6.7044 5.162 8.9964 6.7172C9.97532 6.45022 10.9853 6.31423 12 6.3128C13.02 6.3176 14.046 6.4508 15.0048 6.7172C17.2956 5.162 18.3012 5.4848 18.3012 5.4848C18.9564 7.1396 18.5436 8.3624 18.4212 8.666C19.1892 9.506 19.6548 10.58 19.6548 11.8916C19.6548 16.5092 16.848 17.5256 14.1756 17.8232C14.6064 18.194 14.9892 18.9272 14.9892 20.0492C14.9892 21.6548 14.9748 22.952 14.9748 23.3456C14.9748 23.6672 15.1908 24.0416 15.8004 23.924C18.19 23.1225 20.2672 21.5904 21.7386 19.5441C23.2099 17.4977 24.001 15.0408 24 12.5204C24 5.8808 18.6264 0.5 12 0.5Z"
                          fill="currentColor"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_95_589">
                          <rect
                            width="24"
                            height="24"
                            fill="white"
                            transform="translate(0 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  )}
                  <span>Sign in with GitHub</span>
                </Button>
              </div>
            )}

            {/* Divider - only show for sign-in and sign-up when there are form fields below */}
            {(isSignIn || type === "sign-up") && (
              <div className="flex items-center justify-stretch">
                <div className="border-b border-gray-alpha-200 w-full"></div>
                <div className="font-medium text-xs text-gray-alpha-400 px-2.5 whitespace-nowrap">
                  Or continue with email
                </div>
                <div className="border-b border-gray-alpha-200 w-full"></div>
              </div>
            )}

            {/* Email/Password Form */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn("flex flex-col gap-4", className)}
                {...props}
              >
                {!isSignIn &&
                  !isForgotPassword &&
                  !isResetPassword &&
                  !isVerifyEmail &&
                  !isResendVerification && (
                    <div className="relative flex flex-col gap-1">
                      <Label
                        htmlFor="name"
                        className="text-sm text-foreground font-medium cursor-pointer"
                      >
                        Name
                      </Label>
                      <CustomFormField
                        control={form.control}
                        name="name"
                        label=""
                        placeholder="Your name"
                        type="text"
                      />
                    </div>
                  )}

                {!isResetPassword && !isVerifyEmail && (
                  <div className="relative flex flex-col gap-1">
                    <Label
                      htmlFor="email"
                      className="text-sm text-foreground font-medium cursor-pointer "
                    >
                      Email
                    </Label>
                    <CustomFormField
                      control={form.control}
                      name="email"
                      label=""
                      placeholder="Enter your email address"
                      type="email"
                    />
                  </div>
                )}

                {!isForgotPassword &&
                  !isVerifyEmail &&
                  !isResendVerification && (
                    <div className="relative flex flex-col gap-1">
                      <Label
                        htmlFor="password"
                        className="text-sm text-foreground font-medium cursor-pointer"
                      >
                        Password
                      </Label>
                      <CustomFormField
                        control={form.control}
                        name="password"
                        label=""
                        placeholder={
                          isResetPassword
                            ? "Enter your new password"
                            : "Enter your password"
                        }
                        type="password"
                      />
                      {isSignIn && (
                        <button
                          type="button"
                          className="absolute top-[3px] right-0 text-xs text-gray-alpha-950 font-medium ring-0 outline-gray-alpha-950 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring disabled:text-gray-alpha-600 hover:underline"
                          onClick={() => router.push("/forgot-password")}
                        >
                          Forgot password
                        </button>
                      )}
                    </div>
                  )}

                {isResetPassword && (
                  <div className="relative flex flex-col gap-1">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm text-foreground font-medium cursor-pointer"
                    >
                      Confirm new password
                    </Label>
                    <CustomFormField
                      control={form.control}
                      name="confirmPassword"
                      label=""
                      placeholder="Confirm new password"
                      type="password"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <Button
                    type="submit"
                    className="relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary duration-75 focus-ring disabled:pointer-events-auto data-[loading='true']:!text-transparent text-background shadow-none hover:bg-gray-alpha-800 radix-state-open:bg-gray-alpha-700 active:bg-gray-alpha-700 disabled:bg-gray-alpha-400 disabled:text-gray-100 px-3 gap-2.5 w-full h-10"
                    disabled={!isFormValid() || isLoading}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isForgotPassword
                      ? "Send reset link"
                      : isResetPassword
                      ? "Update password"
                      : isVerifyEmail
                      ? "Verify email"
                      : isResendVerification
                      ? "Resend verification"
                      : isSignIn
                      ? "Sign in"
                      : "Create account"}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Footer Links */}
            <footer className="flex items-center justify-center text-sm text-gray-alpha-600 gap-1">
              {isForgotPassword ? (
                <>
                  Remember your password?{" "}
                  <Link
                    href="/sign-in"
                    className="font-medium text-gray-alpha-950 underline ring-0 outline-gray-alpha-950 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </>
              ) : isResetPassword ? (
                <>
                  Back to{" "}
                  <Link
                    href="/sign-in"
                    className="font-medium text-gray-alpha-950 underline ring-0 outline-gray-alpha-950 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </>
              ) : isVerifyEmail ? (
                <>
                  Didn&apos;t receive the email?{" "}
                  <Link
                    href="/resend-verification"
                    className="font-medium text-gray-alpha-950 underline ring-0 outline-gray-alpha-950 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Resend verification
                  </Link>
                </>
              ) : isResendVerification ? (
                <>
                  Back to{" "}
                  <Link
                    href="/sign-in"
                    className="font-medium text-gray-alpha-950 underline ring-0 outline-gray-alpha-950 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  {isSignIn
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <Link
                    href={isSignIn ? "/sign-up" : "/sign-in"}
                    className="font-medium text-gray-alpha-950 underline ring-0 outline-gray-alpha-950 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {isSignIn ? "Sign up" : "Sign in"}
                  </Link>
                </>
              )}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AuthForm };
