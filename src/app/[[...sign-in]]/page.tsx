"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const features = [
  {
    icon: "🎓",
    title: "Smart academics",
    body: "Manage classes, lessons, exams, assignments, and results in one place.",
  },
  {
    icon: "📊",
    title: "Real-time insights",
    body: "Live attendance, performance dashboards, and finance reports for admins.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent & student portals",
    body: "Tailored experiences so every role sees exactly what they need.",
  },
];

const LoginPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const role = user?.publicMetadata?.role as string | undefined;

  useEffect(() => {
    if (!isSignedIn) return;
    if (role) router.push(`/${role}`);
    else router.push("/onboarding");
  }, [isSignedIn, role, router]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-ink-50">
      {/* LEFT — Brand panel */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-school-hero text-white overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full bg-yellow-300/30 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
              <Image src="/logo.png" alt="logo" width={28} height={28} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70">
                Welcome to
              </p>
              <h1 className="text-xl font-bold">Smart School ERP</h1>
            </div>
          </div>

          <div className="max-w-lg space-y-6 my-12">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              Run your entire school.{" "}
              <span className="text-yellow-200"></span>
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              One platform for admins, teachers, parents, and students — built
              to make school operations effortless.
            </p>

            <ul className="space-y-4 pt-4">
              {features.map((f) => (
                <li key={f.title} className="flex gap-4 items-start">
                  <div className="text-2xl shrink-0 w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/15">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-sm text-white/70">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/70">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-yellow-300 ring-2 ring-white/30" />
              <div className="w-8 h-8 rounded-full bg-pink-300 ring-2 ring-white/30" />
              <div className="w-8 h-8 rounded-full bg-emerald-300 ring-2 ring-white/30" />
              <div className="w-8 h-8 rounded-full bg-sky-300 ring-2 ring-white/30" />
            </div>
            <span>Trusted by educators across the country</span>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Image src="/logo.png" alt="logo" width={24} height={24} />
            </div>
            <h1 className="text-lg font-bold text-ink-900">Smart School ERP</h1>
          </div>

          {/* Three states: loading, signed-in, or auth tabs */}
          {!isLoaded ? (
            <div className="bg-white p-10 rounded-3xl shadow-soft border border-ink-100 text-center text-ink-500">
              Loading…
            </div>
          ) : isSignedIn ? (
            <SignedInPanel role={role} />
          ) : (
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-soft border border-ink-100">
              <SignInBox />
              <p className="text-center text-xs text-ink-500 mt-6">
                Don&apos;t have an account? Ask your school admin — accounts are
                created from the admin dashboard.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-ink-400 mt-6">
            © {new Date().getFullYear()} Smart School ERP · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

const SignInBox = () => (
  <SignIn.Root>
    <SignIn.Step name="start" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-ink-900">Welcome back 👋</h2>
        <p className="text-sm text-ink-500">
          Sign in to access your school dashboard.
        </p>
      </div>

      <Clerk.GlobalError className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-3" />

      <Clerk.Field name="identifier" className="flex flex-col gap-1.5">
        <Clerk.Label className="text-xs font-semibold text-ink-700 uppercase tracking-wide">
          Username
        </Clerk.Label>
        <Clerk.Input
          type="text"
          required
          placeholder="e.g. teacher01"
          className="px-4 py-3 rounded-xl ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition placeholder:text-ink-400 text-sm"
        />
        <Clerk.FieldError className="text-xs text-red-500 mt-1" />
      </Clerk.Field>

      <Clerk.Field name="password" className="flex flex-col gap-1.5">
        <Clerk.Label className="text-xs font-semibold text-ink-700 uppercase tracking-wide">
          Password
        </Clerk.Label>
        <Clerk.Input
          type="password"
          required
          placeholder="••••••••"
          className="px-4 py-3 rounded-xl ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition placeholder:text-ink-400 text-sm"
        />
        <Clerk.FieldError className="text-xs text-red-500 mt-1" />
      </Clerk.Field>

      <SignIn.Action
        submit
        className="bg-brand-gradient text-white font-semibold rounded-xl text-sm py-3 mt-2 hover:opacity-95 active:opacity-90 transition shadow-glow"
      >
        Sign In →
      </SignIn.Action>
    </SignIn.Step>
  </SignIn.Root>
);

const SignedInPanel = ({ role }: { role: string | undefined }) => (
  <div className="bg-white p-8 rounded-3xl shadow-soft border border-ink-100 flex flex-col gap-4">
    <div className="text-3xl">✅</div>
    <h2 className="text-2xl font-bold text-ink-900">You&apos;re signed in</h2>
    {role ? (
      <p className="text-sm text-ink-500">
        Redirecting you to your{" "}
        <span className="capitalize font-semibold">{role}</span> dashboard…
      </p>
    ) : (
      <p className="text-sm text-ink-500">
        Your account doesn&apos;t have a role assigned yet. Ask your admin to
        set your role in Clerk public metadata, then sign back in.
      </p>
    )}
    <SignOutButton redirectUrl="/">
      <button className="bg-ink-900 text-white font-semibold rounded-xl text-sm py-3 hover:bg-ink-700 transition">
        Sign out
      </button>
    </SignOutButton>
  </div>
);

export default LoginPage;
