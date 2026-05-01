"use client";

import { SignOutButton } from "@clerk/nextjs";
import Image from "next/image";

const LogoutButton = () => {
  return (
    <SignOutButton redirectUrl="/">
      <button className="group flex items-center justify-center lg:justify-start gap-3 text-ink-500 py-2.5 px-2 lg:px-3 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors w-full">
        <span className="w-5 h-5 flex items-center justify-center">
          <Image src="/logout.png" alt="" width={18} height={18} />
        </span>
        <span className="hidden lg:block font-medium">Logout</span>
      </button>
    </SignOutButton>
  );
};

export default LogoutButton;
