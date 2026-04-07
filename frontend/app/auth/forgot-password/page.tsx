"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import AuthBackground from "../auth-background";
import { usePasswordResetRequest } from "@/hooks/auth";
import {
  PasswordResetRequestSchema,
  type PasswordResetRequestFormValues,
} from "@/services/auth";

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(PasswordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const requestMutation = usePasswordResetRequest();

  const onSubmit = (data: PasswordResetRequestFormValues) => {
    requestMutation.mutate(data);
  };

  return (
    <div className="min-h-screen items-center justify-center">
      <AuthBackground />

      <div className="fixed top-[20%] right-[15%]">
        <div className="flex w-96 flex-col items-center rounded-lg bg-white shadow-md">
          <div className="mt-4 text-lg font-bold">Forgot Password</div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col space-y-4 p-6">
            <CPInput
              {...register("email")}
              placeholder="Email"
              label="Email"
              error={errors.email?.message}
              required
            />

            <p className="text-xs text-gray-500">
              Enter your account email and we will send a reset link if it exists.
            </p>

            {requestMutation.isSuccess && (
              <p className="text-xs text-green-700">{requestMutation.data.detail}</p>
            )}

            {requestMutation.isError && (
              <p className="text-xs text-red-600">Failed to request reset link. Please try again.</p>
            )}

            <CPButton
              label={requestMutation.isPending ? "Sending..." : "Send Reset Link"}
              type="submit"
              disabled={requestMutation.isPending}
            />

            <Link href="/auth/login" className="text-center text-xs text-primary hover:underline">
              Back to Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
