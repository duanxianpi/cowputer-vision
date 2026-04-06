'use client';

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CPButton from "@/components/CPButton";
import CPInput from "@/components/CPInput";
import CPPageHeader from "@/components/CPPageHeader";
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

  const onSubmit = handleSubmit(async (values) => {
    const payload = normalizePayload(values);
    await updateSettingsMutation.mutateAsync(payload);
    reset(payload);
  });

  const handleDiscardChanges = () => {
    reset(toFormValues(settingsQuery.data));
  };

  const isSaving = isSubmitting || updateSettingsMutation.isPending;

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

        {updateSettingsMutation.isSuccess && !isDirty && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
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

        <form id="settings-form" onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-2">
          {SETTINGS_SECTIONS.map((section) => {
            const sectionHasError = section.fields.some((f) => errors[f.key]);
            return (
              <section
                key={section.title}
                className={`rounded-2xl bg-white p-6 shadow-sm ring-1 transition-colors ${
                  sectionHasError ? "ring-red-200" : "ring-transparent"
                }`}
              >
                <div className="mb-5 border-b border-gray-100 pb-4">
                  <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {section.description}
                  </p>
                </div>

                <div className="space-y-5">
                  {section.fields.map((field) => (
                    <CPInput
                      key={field.key}
                      id={field.key}
                      type="text"
                      inputMode={field.inputMode}
                      label={field.label}
                      unit={field.unit}
                      placeholder={field.placeholder}
                      description={field.description}
                      error={errors[field.key]?.message}
                      {...register(field.key)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </form>
      </div>
    </div>
  );
}

