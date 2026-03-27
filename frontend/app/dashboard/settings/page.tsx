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

  const handleResetChanges = () => {
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
                  onClick={handleResetChanges}
                  disabled={isSaving}
                  label="Reset Changes"
                />
                <CPButton
                  type="submit"
                  form="settings-form"
                  disabled={isSaving}
                  label={isSaving ? "Saving..." : "Save Settings"}
                />
              </>
            }
          />

          {updateSettingsMutation.isSuccess && !isDirty && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {updateSettingsMutation.data.detail}
            </div>
          )}

          {isDirty && (
            <div className="rounded-xl border border-primary/20 bg-secondary/40 px-4 py-3 text-sm text-gray-800">
              You have unsaved changes.
            </div>
          )}
      </div>

      <div className="px-6 pb-6 flex flex-col gap-6">

        {settingsQuery.isLoading && (
            <div className="grid gap-6 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
                  <Skeleton width={160} height={22} className="mb-2" />
                  <Skeleton width={240} height={14} className="mb-6" />
                  <div className="space-y-5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="rounded-xl border border-gray-100 p-4">
                        <Skeleton width={100} height={14} className="mb-2" />
                        <Skeleton height={36} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        )}

        <form id="settings-form" onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-2">
          {SETTINGS_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {section.description}
                </p>
              </div>

              <div className="space-y-5">
                {section.fields.map((field) => (
                  <div key={field.key} className="rounded-xl border border-gray-100 p-4">
                    <CPInput
                      id={field.key}
                      label={field.label}
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      description={field.description}
                      error={errors[field.key]?.message}
                      {...register(field.key)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </form>
      </div>
    </div>
  );
}
