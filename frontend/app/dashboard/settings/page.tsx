'use client';

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CPButton from "@/components/CPButton";
import CPInput from "@/components/CPInput";
import CPPageHeader from "@/components/CPPageHeader";
import { useEmailResetRequest } from "@/hooks/auth";
import { useSettings, useUpdateSettings } from "@/hooks/settings";
import {
  settingsFormSchema,
  DEFAULT_SETTINGS,
  SETTINGS_SECTIONS,
  toFormValues,
  normalizePayload,
  type SettingsFormValues,
} from "@/services/settings";

export default function SettingsPage() {
  const settingsQuery = useSettings({ retry: false });
  const updateSettingsMutation = useUpdateSettings();
  const emailResetRequestMutation = useEmailResetRequest();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset(toFormValues(settingsQuery.data));
    }
  }, [settingsQuery.data, reset]);

  const onSubmit = handleSubmit(
    async (values) => {
      const payload = normalizePayload(values);
      await updateSettingsMutation.mutateAsync(payload);
      reset(payload);
    },
    (formErrors) => {
      const firstInvalidSection = SETTINGS_SECTIONS.findIndex((section) =>
        section.fields.some((field) => Boolean(formErrors[field.key]))
      );
      if (firstInvalidSection >= 0) {
        setActiveSectionIndex(firstInvalidSection);
      }
    }
  );

  const handleDiscardChanges = () => {
    reset(toFormValues(settingsQuery.data));
  };

  const isSaving = isSubmitting || updateSettingsMutation.isPending;
  const sectionErrors = SETTINGS_SECTIONS.map((section) =>
    section.fields.some((field) => errors[field.key])
  );
  const activeSection = SETTINGS_SECTIONS[activeSectionIndex] ?? SETTINGS_SECTIONS[0];

  return (
    <div>
      <div className="sticky top-0 z-10 bg-gray-50 px-6 pt-6 pb-2">
        <CPPageHeader
          title="Settings"
          actions={
            <>
              <CPButton
                type="button"
                variant="secondary"
                onClick={handleDiscardChanges}
                disabled={!isDirty || isSaving}
                label="Discard Changes"
              />
              <CPButton
                type="submit"
                form="settings-form"
                disabled={isSaving}
                label={isSaving ? "Saving…" : "Save Changes"}
              />
            </>
          }
        />

        {emailResetRequestMutation.isSuccess && (
          <div className="mt-2 flex items-center gap-2 rounded-xl text-green-900 bg-secondary px-4 py-3 text-sm ">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {emailResetRequestMutation.data.detail}
          </div>
        )}

        {emailResetRequestMutation.isError && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Failed to send email verification link. Please try again.
          </div>
        )
        }

        {updateSettingsMutation.isSuccess && !isDirty && (
          <div className="mt-2 flex items-center gap-2 rounded-xl text-green-900 bg-secondary px-4 py-3 text-sm">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {updateSettingsMutation.data.detail}
          </div>
        )}

        {updateSettingsMutation.isError && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Failed to save settings. Please try again.
          </div>
        )}

        {isDirty && !updateSettingsMutation.isError && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            You have unsaved changes.
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex flex-col gap-6 pt-4">

        {settingsQuery.isLoading && (
          <div className="grid gap-6 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
                <Skeleton width={160} height={22} className="mb-2" />
                <Skeleton width={240} height={14} className="mb-6" />
                <div className="space-y-5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j}>
                      <Skeleton width={100} height={13} className="mb-2" />
                      <Skeleton height={38} />
                      <Skeleton width={200} height={11} className="mt-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {settingsQuery.isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
            Unable to load settings. Please refresh the page.
          </div>
        )}

        <form id="settings-form" onSubmit={onSubmit} className="space-y-4">
          <div className="overflow-x-auto border-b border-gray-200">
            <div className="flex min-w-max items-center gap-5" role="tablist" aria-label="Settings sections">
              {SETTINGS_SECTIONS.map((section, index) => {
                const isActive = index === activeSectionIndex;
                const hasError = sectionErrors[index];

                return (
                  <button
                    key={section.title}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`settings-panel-${index}`}
                    onClick={() => setActiveSectionIndex(index)}
                    className={`inline-flex items-center gap-2 border-b-2 px-0 pb-2 pt-1 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-600 hover:text-primary"
                    }`}
                  >
                    <span>{section.title}</span>
                    {hasError && (
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isActive ? "bg-primary" : "bg-red-500"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <section
            id={`settings-panel-${activeSectionIndex}`}
            role="tabpanel"
            className={`rounded-2xl bg-white p-6 shadow-sm ring-1 transition-colors ${
              sectionErrors[activeSectionIndex] ? "ring-red-200" : "ring-transparent"
            }`}
          >
            <div className="mb-5 border-b border-gray-100 pb-4">
              <h2 className="text-base font-semibold text-gray-900">{activeSection.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                {activeSection.description}
              </p>
            </div>

            <div className="space-y-5">
              {activeSection.fields.map((field) => (
                <div key={field.key} className="max-w-xl">
                  <CPInput
                    id={field.key}
                    type="text"
                    inputMode={field.inputMode}
                    label={field.label}
                    unit={field.unit}
                    placeholder={field.placeholder}
                    description={field.description}
                    readOnly={field.readOnly}
                    error={errors[field.key]?.message}
                    {...register(field.key)}
                  />
                </div>
              ))}

              {activeSection.title === "Setup" && (
                <div className="max-w-xl rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm text-gray-700">
                    To change your email, send a verification link to your current address.
                  </p>
                  <CPButton
                    type="button"
                    variant="secondary"
                    onClick={() => emailResetRequestMutation.mutate()}
                    disabled={emailResetRequestMutation.isPending}
                    label={emailResetRequestMutation.isPending ? "Sending..." : "Send Verification Link"}
                  />
                </div>
              )}
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

