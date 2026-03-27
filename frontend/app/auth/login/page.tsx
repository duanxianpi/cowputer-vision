"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import AuthBackground from "../auth-background";

import { useLogin } from "@/hooks/auth";
import { LoginSchema, type LoginFormValues } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });

  const loginMutation = useLogin({
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.token);
      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }
      router.push("/dashboard"); 
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const isSubmitting = loginMutation.isPending;

  return (
    <div className="min-h-screen items-center justify-center">
      <AuthBackground />

      <div className="fixed top-[20%] right-[15%]">
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md w-80">
          <div className="mt-4 text-lg font-bold">
            Login
          </div>
          
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className="p-6 space-y-4 flex flex-col w-full"
          >
            <CPInput 
              {...register("username")} 
              placeholder="Username or Email" 
              label="Username"
              error={errors.username?.message}
              required
            />

            <CPInput 
              type="password" 
              {...register("password")} 
              placeholder="Password" 
              label="Password"
              error={errors.password?.message}
              required
            />

            {loginMutation.isError && (
              <p className="text-xs text-red-600 text-center">
                Login failed. Please check your credentials.
              </p>
            )}

            <CPButton 
              label={isSubmitting ? "Logging in..." : "Login"} 
              type="submit" 
              disabled={isSubmitting}
            />
          </form>
        </div>
      </div>
    </div>
  );
}