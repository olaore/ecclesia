import React from "react";
import { Outlet } from "react-router-dom";

/**
 * AuthLayout provides a centered card layout for authentication pages
 * like Login, Sign Up, and Password Reset.
 */
export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-5xl font-black tracking-tight bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
          Nehemiah
        </h1>
        <p className="text-muted-foreground mt-2">Church Management System</p>
      </div>
      <main className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <Outlet />
      </main>
    </div>
  );
};
