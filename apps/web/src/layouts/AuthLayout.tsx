import React from "react";
import { Outlet } from "react-router-dom";

/**
 * AuthLayout provides a centered card layout for authentication pages
 * like Login, Sign Up, and Password Reset.
 */
export const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="max-w-xl space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
              Church Operations
            </p>
            <div className="space-y-4">
              <h1 className="text-6xl font-semibold tracking-[-0.06em] text-foreground">
                Nehemiah
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Church administration software that feels calm, clear, and ready for real weekly work.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-card p-5">
                <p className="text-sm font-semibold text-foreground">Attendance and guest capture</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Built for service-day speed instead of spreadsheet fatigue.
                </p>
              </div>
              <div className="surface-card p-5">
                <p className="text-sm font-semibold text-foreground">Member records that stay tidy</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Better structure, less noise, and the right amount of detail.
                </p>
              </div>
            </div>
          </div>
        </section>

        <main className="w-full max-w-md justify-self-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-6 text-center lg:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
              Church Operations
            </p>
            <h1 className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-foreground">
              Nehemiah
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Church administration software that feels clear and composed.
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
