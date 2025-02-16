"use client";

import { NavigationHeader } from "@/components/ui/NavBar";
import Main from "@/components/ui/main";

export default function HomePage() {
  return (
    <div>
      <NavigationHeader />
      <div className="flex">
        <Main />
      </div>
    </div>
  );
}
