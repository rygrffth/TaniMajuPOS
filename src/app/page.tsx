"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ScalingContainer from "@/components/ScalingContainer";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to admin/POS page
    router.replace("/admin");
  }, [router]);

  return (
    <ScalingContainer bg="bg-slate-900" baseWidth={1366} baseHeight={768} mode="width" forceFluid={true}>
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-bold tracking-widest animate-pulse">MEMUAT POS TANI MAJU...</p>
        </div>
      </main>
    </ScalingContainer>
  );
}
