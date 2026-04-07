"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import { useEmailResetConfirm, useLogout } from "@/hooks/auth";
import {
  EmailResetConfirmSchema,
  type EmailResetConfirmPayload,
} from "@/services/auth";

type ResetEmailFormValues = Pick<EmailResetConfirmPayload, "new_email">;

function ResetEmailPageContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const logout = useLogout();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetEmailFormValues>({
    resolver: zodResolver(EmailResetConfirmSchema.pick({ new_email: true })),
  });

  const confirmMutation = useEmailResetConfirm({
    onSuccess: () => {
      logout();
    },
  });

  const onSubmit = (data: ResetEmailFormValues) => {
    if (!token) return;
    confirmMutation.mutate({ token, new_email: data.new_email });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Confirm Email Change</h1>
        <p className="mt-2 text-sm text-gray-600">Enter the new email address for your account.</p>

        {!token ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Invalid verification link. Please request a new email reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <CPInput
              type="email"
              label="New Email"
              placeholder="name@example.com"
              error={errors.new_email?.message}
              {...register("new_email")}
            />

            {confirmMutation.isError && (
              <p className="text-xs text-red-600">Invalid or expired token. Please request a new verification link.</p>
            )}

            {confirmMutation.isSuccess && (
              <p className="text-xs text-green-700">{confirmMutation.data.detail}</p>
            )}

            <CPButton
              type="submit"
              label={confirmMutation.isPending ? "Updating..." : "Update Email"}
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

export default function ResetEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ResetEmailPageContent />
    </Suspense>
  );
}
