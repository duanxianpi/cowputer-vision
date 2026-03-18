"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import AuthBackground from "../auth-background";
import { useRouter } from "next/navigation";

import { useSetup } from "@/hooks/auth";
import { SetupPayload } from "@/services/auth";
import { schemas } from "@/api/client";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SetupPayload>({
    resolver: zodResolver(schemas.Setup),
  });

  const setupMutation = useSetup({
    onSuccess: (data) => {
      router.push("auth/login"); 
    },
    onError: (error: any) => {
      console.error("Login Failed:", error);
    }
  });

  const onSubmit = (data: SetupPayload) => {
    setupMutation.mutate(data);
  };
  return (
    <div className="min-h-screen items-center justify-center">
      <AuthBackground />
      <div className="fixed top-[20%] right-[15%]">
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md w-80">
          <div className="mt-4 text-lg font-bold">
            Setup For COWPUTER
          </div>
          <form 
            onSubmit={handleSubmit(onSubmit, (e) => console.log("Validation Errors:", e))} 
            className="p-6 space-y-4 flex flex-col w-full"
          >
            <CPInput {...register("email")} placeholder="Email" label="Email" />
            {errors.email && <div className="text-red-500">{errors.email.message}</div>}

            <CPInput {...register("username")} placeholder="Username" label="Username"/>
            {errors.username && <div className="text-red-500">{errors.username.message}</div>}

            <CPInput type="password" {...register("password")} placeholder="Password" label="Password"/>
            {errors.password && <div className="text-red-500">{errors.password.message}</div>}

            <CPInput {...register("rtsp_url")} placeholder="RTSP Endpoint" label="RTSP"/>
            {errors.rtsp_url && <div className="text-red-500">{errors.rtsp_url.message}</div>}

            <CPButton label={isSubmitting ? "Registering..." : "Register"} type="submit" disabled={isSubmitting}>
            </CPButton>
          </form>
        </div>
      </div>
    </div>
  );
}
