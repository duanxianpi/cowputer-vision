import uuid
from django.db import models
from django.contrib.auth.models import User

class AppConfig(models.Model):
    is_initialized = models.BooleanField(default=False)
    rtsp_url = models.CharField(max_length=255)

class Setting(models.Model):
    key = models.CharField(max_length=100, primary_key=True)
    value = models.CharField(max_length=255)

class VideoSegment(models.Model):
    filename = models.CharField(max_length=255)
    start_ts = models.BigIntegerField()
    end_ts = models.BigIntegerField()
    file_path = models.CharField(max_length=1024)

class TrackingData(models.Model):
    id = models.BigAutoField(primary_key=True)
    cow_id = models.CharField(max_length=100)
    timestamp = models.BigIntegerField()
    behavior = models.CharField(max_length=100)
    bbox = models.JSONField()

class AlertRule(models.Model):
    name = models.CharField(max_length=255)
    conditions = models.JSONField()
    actions = models.JSONField()
    is_active = models.BooleanField(default=True)

class AlertEvent(models.Model):
    rule = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name='events')
    triggered_at = models.DateTimeField(auto_now_add=True)
    details = models.JSONField()

class Report(models.Model):
    report_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=100)
    data = models.JSONField()
    generated_at = models.DateTimeField(auto_now_add=True)
