import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../store/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

import { apiClient, ApiError } from "../../lib/api";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiClient<{ data: { token: string; user: any } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    onSuccess: (response) => {
      setAuth(response.data.token, response.data.user);
      navigate("/dashboard");
    },
    onError: (err: ApiError) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate();
  };

  return (
    <Card className="overflow-hidden border-white/70 bg-white/90">
      <CardHeader>
        <CardTitle className="text-[1.75rem]">Sign in</CardTitle>
        <CardDescription>
          Use your staff credentials to open the church workspace.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email address</label>
            <Input
              type="email"
              placeholder="office@church.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Enter workspace"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
