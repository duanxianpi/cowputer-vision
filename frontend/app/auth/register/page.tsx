"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import AuthBackground from "../auth-background";
import { useRouter } from "next/navigation";

import { useSetup } from "@/hooks/auth";
import { SetupSchema, type SetupFormValues } from "@/services/auth";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SetupFormValues>({
    resolver: zodResolver(SetupSchema),
  });

  const setupMutation = useSetup({
    onSuccess: () => {
      router.push("/auth/login"); 
    },
  });

  const onSubmit = (data: SetupFormValues) => {
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
            onSubmit={handleSubmit(onSubmit)} 
            className="p-6 space-y-4 flex flex-col w-full"
          >
            <CPInput {...register("email")} placeholder="Email" label="Email" error={errors.email?.message} required />
            <CPInput {...register("username")} placeholder="Username" label="Username" error={errors.username?.message} required />
            <CPInput type="password" {...register("password")} placeholder="Password" label="Password" error={errors.password?.message} required />
            <CPInput {...register("rtsp_url")} placeholder="rtsp://..." label="RTSP URL" error={errors.rtsp_url?.message} required />

            {setupMutation.isError && (
              <p className="text-xs text-red-600 text-center">
                Setup failed. Please try again.
              </p>
            )}

            <CPButton label={isSubmitting ? "Registering..." : "Register"} type="submit" disabled={isSubmitting} />
          </form>
        </div>
      </div>
    </div>
  );
}
