"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import { useLogout, usePasswordResetConfirm } from "@/hooks/auth";

const ResetPasswordSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
    confirm_password: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const logout = useLogout();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const confirmMutation = usePasswordResetConfirm({
    onSuccess: () => {
      logout();
    },
  });

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) return;
    confirmMutation.mutate({ token, new_password: data.new_password });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Reset Password</h1>
        <p className="mt-2 text-sm text-gray-600">Set a new password for your account.</p>

        {!token ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Invalid reset link. Please request a new password reset email.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <CPInput
              type="password"
              label="New Password"
              placeholder="Enter new password"
              error={errors.new_password?.message}
              {...register("new_password")}
            />

            <CPInput
              type="password"
              label="Confirm Password"
              placeholder="Re-enter new password"
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />

            {confirmMutation.isError && (
              <p className="text-xs text-red-600">Invalid or expired token. Please request a new reset link.</p>
            )}

            {confirmMutation.isSuccess && (
              <p className="text-xs text-green-700">{confirmMutation.data.detail}</p>
            )}

            <CPButton
              type="submit"
              label={confirmMutation.isPending ? "Updating..." : "Update Password"}
              disabled={confirmMutation.isPending}
            />
          </form>
        )}

        <div className="mt-4">
          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
