"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className="absolute left-4 top-4 z-10 hidden rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md md:flex lg:left-8"
      aria-label="뒤로 가기"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
