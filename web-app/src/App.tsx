"use client";

import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Dashboard } from "./components/dashboard";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { BuyTokensModal } from "./components/buy-tokens-modal";
import { Button } from "./components/ui/button";
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle";
import { LandingPage } from "./components/landing-page";
import { SignInModal } from "./components/sign-in-modal";

export default function App() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header setIsSignInModalOpen={setIsSignInModalOpen} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Authenticated>
            <Dashboard />
          </Authenticated>
          <Unauthenticated>
            <LandingPage onGetStarted={() => setIsSignInModalOpen(true)} />
          </Unauthenticated>
        </main>
      </div>
      <SignInModal isOpen={isSignInModalOpen} onClose={() => setIsSignInModalOpen(false)} />
    </ThemeProvider>
  );
}

function Header({ setIsSignInModalOpen }: { setIsSignInModalOpen: (isOpen: boolean) => void }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.auth.currentUser);
  const [isBuyTokensModalOpen, setIsBuyTokensModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                🧠 Brainrot Academy
              </h1>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Content Management
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <ModeToggle />
              {isAuthenticated && (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Tokens: {currentUser?.tokens ?? 10}
                </span>
              )}
              {/* {isAuthenticated && (
                <Button variant="outline" onClick={() => setIsBuyTokensModalOpen(true)}>Buy Tokens</Button>
              )} */}
              {isAuthenticated && (
                <button
                  onClick={() => void signOut()}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Sign out
                </button>
              )}
              {!isAuthenticated && (
                <Button onClick={() => setIsSignInModalOpen(true)}>Sign in</Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <BuyTokensModal
        isOpen={isBuyTokensModalOpen}
        onClose={() => setIsBuyTokensModalOpen(false)}
      />
    </>
  );
}