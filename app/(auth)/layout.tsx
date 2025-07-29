import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Gamepad2, Users, Trophy, Sparkles } from "lucide-react";
import Link from "next/link";

import { isAuthenticated, isAnonymousUser } from "@/lib/actions/auth.action";
import { Logo } from "@/components/shared";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  const isAnonymous = await isAnonymousUser();

  // Only redirect if user is authenticated AND not anonymous
  // Anonymous users should be able to access auth pages to convert their account
  // This allows them to sign up/sign in with email or social providers
  if (isUserAuthenticated && !isAnonymous) {
    redirect("/");
  }

  return (
    <div className="h-full w-full flex flex-col justify-center">
      <div className="w-full flex justify-start items-center min-h-[calc(100vh-1.5rem)] p-5 lg:p-0">
        {/* Logo */}
        <div className="absolute top-8 md:top-8 left-5 md:left-8">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex justify-center items-center w-[45%] grow">
          <div className="flex flex-col justify-center items-center h-full w-[360px] py-16 md:py-24">
            <div className="relative w-full">
              <div className="flex flex-col gap-6 w-full">{children}</div>
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="w-[55%] hidden lg:block">
          <div className="fixed top-0 right-0 h-full py-[3vh] pr-[3vh] w-[55%]">
            <aside className="relative flex flex-col justify-center w-full h-full max-h-full items-center">
              <div className="w-full pb-[100%]"></div>
              <div className="absolute h-full w-full overflow-hidden rounded-3xl bg-muted flex flex-col items-start justify-end max-h-[1200px] max-w-[1200px]">
                <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-orange-500/5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-8 p-12 max-w-md">
                      {/* Main Icon */}
                      <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-purple-500/5">
                        <Gamepad2 className="h-10 w-10 text-purple-500" />
                      </div>

                      {/* Main Content */}
                      <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-balance">
                          Battle for Meme Supremacy
                        </h2>
                        <p className="text-muted-foreground text-lg text-balance leading-relaxed">
                          Join the ultimate meme battle royale! Create hilarious
                          combinations, vote for the funniest memes, and compete
                          with friends in real-time. The most entertaining memes
                          win the crown!
                        </p>
                      </div>

                      {/* Feature Icons */}
                      <div className="flex justify-center items-center gap-6 pt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <Users className="h-6 w-6 text-purple-500" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Multiplayer
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-pink-500" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            AI Generated
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-orange-500" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Real-time Voting
                          </span>
                        </div>
                      </div>

                      {/* Game Stats */}
                      <div className="pt-8 border-t border-purple-500/10">
                        <p className="text-sm text-muted-foreground mb-4">
                          Join thousands of meme warriors
                        </p>
                        <div className="flex justify-center items-center gap-8 opacity-60">
                          <div className="w-8 h-8 bg-purple-500/10 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-500">
                              800+
                            </span>
                          </div>
                          <div className="w-8 h-8 bg-pink-500/10 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-pink-500">
                              ∞
                            </span>
                          </div>
                          <div className="w-8 h-8 bg-orange-500/10 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-orange-500">
                              🏆
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          <span className="text-purple-500">Memes</span> •{" "}
                          <span className="text-pink-500">Combinations</span> •{" "}
                          <span className="text-orange-500">Battles</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
