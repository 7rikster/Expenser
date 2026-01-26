"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import Image from "next/image";

function SignInUI() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-zinc-900 text-white flex">
      {/* Left Section */}
      <div className="flex-1 flex flex-col justify-center px-12 py-16 lg:px-20">
        <div className="max-w-4xl">
          {/* Logo */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-3 text-2xl font-bold">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                {/* <span className="text-xl">🐰</span> */}
                <Image
                    src={"/logo.png"}
                    alt="Expenser Logo"
                    width={40}
                    height={40}
                />
              </div>
              <span>Expenser</span>
            </div>
          </div>

          {/* Main Content */}
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Turn Expenses into
            <br />
            Insights with <span className="text-primary">AI.</span>
            <br />
            <span className="text-primary">That Thinks Ahead.</span>
          </h1>

          <p className="text-gray-400 text-lg font-mono">
            Supercharge your expense management with the most

            <br />
            advanced AI financial insights.
          </p>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-12 py-16 bg-gradient-to-br from-zinc-900/50 to-transparent">
        <SignUp
          appearance={{
            baseTheme: resolvedTheme === "dark" ? dark : undefined,
          }}
        />
      </div>

      {/* Bottom Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center text-xs text-gray-500">
        By continuing, you agree to the{" "}
        <a
          href="#"
          className="text-primary hover:text-primary-foreground transition-colors"
        >
          Terms of Use
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="text-primary hover:text-primary-foreground transition-colors"
        >
          Privacy Policy
        </a>{" "}
        applicable to RevEngine
      </div>
    </div>
  );
}

export default SignInUI;
