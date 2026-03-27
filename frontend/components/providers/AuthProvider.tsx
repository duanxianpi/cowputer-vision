'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      router.replace("/auth/login"); 
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <></>
    );
  }

  return <>{children}</>;
}