from django.contrib import admin

from .models import AlertEvent, AlertRule, AppConfig, Report, Setting, TrackingData, VideoSegment


@admin.register(AppConfig)
class AppConfigAdmin(admin.ModelAdmin):
    list_display = ["id", "is_initialized", "rtsp_url"]


@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    list_display = ["key", "value"]


@admin.register(VideoSegment)
class VideoSegmentAdmin(admin.ModelAdmin):
    list_display = ["id", "filename", "start_ts", "end_ts"]
    ordering = ["-start_ts"]


@admin.register(TrackingData)
class TrackingDataAdmin(admin.ModelAdmin):
    list_display = ["id", "cow_id", "behavior", "timestamp"]
    list_filter = ["behavior"]
    ordering = ["-timestamp"]


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "is_active"]
    list_filter = ["is_active"]


@admin.register(AlertEvent)
class AlertEventAdmin(admin.ModelAdmin):
    list_display = ["id", "rule", "triggered_at"]
    ordering = ["-triggered_at"]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["report_id", "report_type", "generated_at"]
    ordering = ["-generated_at"]
