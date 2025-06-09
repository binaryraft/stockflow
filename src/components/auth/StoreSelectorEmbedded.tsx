"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import { XCircle } from "lucide-react";
import { getUserFromToken, loginEmployee } from "@/api/authHandler";
import { saveEmployeeTokenToStorage } from "@/api/staffHandler";
import { getAllStoresToServer } from "@/api/storeHandler";
import { saveClientTokenToStorage } from "@/api/clientStoreHandler";
import { setTokenToStorage, getTokenFromStorage } from "@/api/authHandler";

interface StoreSelectorEmbeddedProps {
  onCancel: () => void;
}

export function StoreSelectorEmbedded({ onCancel }: StoreSelectorEmbeddedProps) {
  const router = useRouter();


  useEffect(() => {
    const storedToken = getTokenFromStorage();
    if (storedToken) {
      router.push("/storeportal");

        }
  }, []);


  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate email format (simple regex)
  const isEmailValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validate form inputs
  const isFormValid = () =>
    isEmailValid(email.trim()) && password.trim().length > 0;

  // Handle login
  const handleLogin = async () => {
    if (!isFormValid()) {
      setError("Please enter a valid email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loginResponse = await loginEmployee(email.trim(), password);
      console.log('login response ', loginResponse.data)
      if (!loginResponse.success || !loginResponse.data?.token) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      const token = loginResponse.data.token;
      console.log('store token = ', token)
      setTokenToStorage(token)
      saveEmployeeTokenToStorage(token);
      // Redirect to the employee dashboard or desired page
      router.push("/storeportal");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Close store selector"
        >
          <XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Employee Terminal Access</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Employee Login</CardTitle>
          <CardDescription>Enter your email and password.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="employee@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            type="email"
            autoComplete="email"
            aria-label="Email"
            spellCheck={false}
          />
          <Input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            type="password"
            autoComplete="current-password"
            aria-label="Password"
          />

          <Button
            onClick={handleLogin}
            disabled={!isFormValid() || loading}
            className="w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

          {error && (
            <p className="text-center text-sm text-red-600 mt-2">{error}</p>
          )}
        </CardContent>

        <CardFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-muted-foreground"
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
