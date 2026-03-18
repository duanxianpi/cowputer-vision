"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import AuthBackground from "../auth-background";

import { useLogin } from "@/hooks/auth";

const loginSchema = z.object({
  username: z.string().min(1, "用户名/邮箱不能为空").max(150),
  password: z.string().min(1, "密码不能为空").max(128),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useLogin({
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.token);
      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }
      router.push("/dashboard"); 
    },
    onError: (error: any) => {
      console.error("Login Failed:", error);
    }
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
            />
            {errors.username && (
              <div className="text-red-500 text-sm">{errors.username.message}</div>
            )}

            <CPInput 
              type="password" 
              {...register("password")} 
              placeholder="Password" 
              label="Password"
            />
            {errors.password && (
              <div className="text-red-500 text-sm">{errors.password.message}</div>
            )}

            {loginMutation.isError && (
              <div className="text-red-500 text-sm text-center">
                登录失败，请检查账号密码
              </div>
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