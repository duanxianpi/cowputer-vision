"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterInput } from "@/schemas/auth";
import { registerUser } from "@/services/auth";
import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import AuthBackground from "../auth-background";

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      const result = await registerUser(data);
      alert("Registered successfully!");
    } catch (err: any) {
      alert("Register failed: " + err.message);
    }
  };
  return (
    <div className="min-h-screen items-center justify-center">
      <AuthBackground />

      <div className="fixed top-[20%] right-[15%]">
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md w-80">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 flex flex-col w-full">
            <CPInput {...register("email")} placeholder="Email" label="Email" />
            {errors.email && <div className="text-red-500">{errors.email.message}</div>}

            <CPInput {...register("username")} placeholder="Username" label="Username"/>
            {errors.username && <div className="text-red-500">{errors.username.message}</div>}

            <CPInput type="password" {...register("password")} placeholder="Password" label="Password"/>
            {errors.password && <div className="text-red-500">{errors.password.message}</div>}

            <CPButton label={isSubmitting ? "Registering..." : "Register"} type="submit" disabled={isSubmitting}>
            </CPButton>
          </form>
        </div>
      </div>
    </div>
  );
}
