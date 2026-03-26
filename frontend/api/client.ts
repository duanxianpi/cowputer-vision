import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";
import { setupApiInterceptors } from "./apiSetup";

const AlertEvent = z
  .object({
    id: z.number().int(),
    rule: z.number().int(),
    triggered_at: z.string().datetime({ offset: true }),
    details: z.unknown(),
  })
  .passthrough();
const AlertRule = z
  .object({
    id: z.number().int(),
    name: z.string().max(255),
    conditions: z.unknown(),
    actions: z.unknown(),
    is_active: z.boolean().optional(),
    events: z.array(AlertEvent),
  })
  .passthrough();
const AlertRuleWrite = z
  .object({
    id: z.number().int(),
    name: z.string().max(255),
    conditions: z.unknown(),
    actions: z.unknown(),
    is_active: z.boolean().optional(),
  })
  .passthrough();
const DetailResponse = z.object({ detail: z.string() }).passthrough();
const Auth = z
  .object({ username: z.string().max(150), password: z.string().max(128) })
  .passthrough();
const TokenResponse = z
  .object({ token: z.string(), refresh: z.string() })
  .passthrough();
const TokenRefresh = z
  .object({ access: z.string(), refresh: z.string() })
  .passthrough();
const VideoSegment = z
  .object({
    id: z.number().int(),
    filename: z.string().max(255),
    start_ts: z
      .number()
      .int()
      .gte(-9223372036854776000)
      .lte(9223372036854776000),
    end_ts: z.number().int().gte(-9223372036854776000).lte(9223372036854776000),
    file_path: z.string().max(1024),
  })
  .passthrough();
const ReportDetail = z
  .object({
    report_id: z.string().uuid(),
    report_type: z.string().max(100),
    data: z.unknown(),
    generated_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const SettingsMap = z.object({ key: z.string() }).passthrough();
const InitStatus = z.object({ initialized: z.boolean() }).passthrough();
const Setup = z
  .object({
    username: z.string().max(150),
    password: z.string().max(128),
    email: z.string().email(),
    rtsp_url: z.string().max(255),
  })
  .passthrough();
const TrackingData = z
  .object({
    id: z.number().int(),
    cow_id: z.string().max(100),
    timestamp: z
      .number()
      .int()
      .gte(-9223372036854776000)
      .lte(9223372036854776000),
    behavior: z.string().max(100),
    bbox: z.unknown(),
  })
  .passthrough();

export const schemas = {
  AlertEvent,
  AlertRule,
  AlertRuleWrite,
  DetailResponse,
  Auth,
  TokenResponse,
  TokenRefresh,
  VideoSegment,
  ReportDetail,
  SettingsMap,
  InitStatus,
  Setup,
  TrackingData,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/api/alerts",
    alias: "api_alerts_list",
    description: `Retrieve all alert rules. Pass &#x60;?include_events&#x3D;true&#x60; to include triggered events.`,
    requestFormat: "json",
    parameters: [
      {
        name: "include_events",
        type: "Query",
        schema: z.enum(["false", "true"]).optional(),
      },
    ],
    response: z.array(AlertRule),
  },
  {
    method: "post",
    path: "/api/alerts",
    alias: "api_alerts_create",
    description: `Create a new alert rule with JsonLogic conditions.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AlertRuleWrite,
      },
    ],
    response: AlertRuleWrite,
  },
  {
    method: "get",
    path: "/api/alerts/:id",
    alias: "api_alerts_retrieve",
    description: `Retrieve a single alert rule with its triggered events.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: AlertRule,
    errors: [
      {
        status: 404,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: "put",
    path: "/api/alerts/:id",
    alias: "api_alerts_update",
    description: `Partially update an existing alert rule.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AlertRuleWrite,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: AlertRuleWrite,
    errors: [
      {
        status: 404,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: "delete",
    path: "/api/alerts/:id",
    alias: "api_alerts_destroy",
    description: `Delete an alert rule and its related events.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 404,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: "post",
    path: "/api/auth",
    alias: "api_auth_create",
    description: `Authenticate with username and password. Returns a JWT access/refresh token pair.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Auth,
      },
    ],
    response: TokenResponse,
    errors: [
      {
        status: 401,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: "post",
    path: "/api/auth/refresh",
    alias: "api_auth_refresh_create",
    description: `Takes a refresh type JSON web token and returns an access type JSON web
token if the refresh token is valid.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: TokenRefresh,
      },
    ],
    response: TokenRefresh,
  },
  {
    method: "get",
    path: "/api/playback",
    alias: "api_playback_list",
    description: `List video segments overlapping the given time range.`,
    requestFormat: "json",
    parameters: [
      {
        name: "end",
        type: "Query",
        schema: z.number().int(),
      },
      {
        name: "start",
        type: "Query",
        schema: z.number().int(),
      },
    ],
    response: z.array(VideoSegment),
    errors: [
      {
        status: 400,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/reports",
    alias: "api_reports_retrieve",
    description: `Without parameters: list all reports (lightweight). With &#x60;?report_id&#x3D;&lt;uuid&gt;&#x60;: retrieve a full report including data.`,
    requestFormat: "json",
    parameters: [
      {
        name: "report_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: ReportDetail,
  },
  {
    method: "get",
    path: "/api/settings",
    alias: "api_settings_retrieve",
    description: `Return all application settings as a JSON object &#x60;{key: value, ...}&#x60;.`,
    requestFormat: "json",
    response: z.object({ key: z.string() }).passthrough(),
  },
  {
    method: "post",
    path: "/api/settings",
    alias: "api_settings_create",
    description: `Create or update settings from a &#x60;{key: value, ...}&#x60; payload.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.record(z.string()),
      },
    ],
    response: z.object({ detail: z.string() }).passthrough(),
  },
  {
    method: "delete",
    path: "/api/settings",
    alias: "api_settings_destroy",
    description: `Delete all settings, resetting to defaults.`,
    requestFormat: "json",
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/setup",
    alias: "api_setup_retrieve",
    description: `Returns whether the application has been initialized.`,
    requestFormat: "json",
    response: z.object({ initialized: z.boolean() }).passthrough(),
  },
  {
    method: "post",
    path: "/api/setup",
    alias: "api_setup_create",
    description: `Creates the initial AppConfig, admin user, and returns a JWT token pair. Returns 403 if already initialized.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Setup,
      },
    ],
    response: TokenResponse,
    errors: [
      {
        status: 403,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: "post",
    path: "/api/tracks",
    alias: "api_tracks_create",
    description: `Query tracking data using a JsonLogic rule set. Supported variables: &#x60;behavior&#x60;, &#x60;timestamp&#x60;, &#x60;cow_id&#x60;. Supported operators: &#x60;and&#x60;, &#x60;or&#x60;, &#x60;!&#x60;, &#x60;&#x3D;&#x3D;&#x60;, &#x60;!&#x3D;&#x60;, &#x60;&gt;&#x60;, &#x60;&gt;&#x3D;&#x60;, &#x60;&lt;&#x60;, &#x60;&lt;&#x3D;&#x60;, &#x60;in&#x60;.

Example body:
&#x60;&#x60;&#x60;json
{&quot;and&quot;: [{&quot;&#x3D;&#x3D;&quot;: [{&quot;var&quot;: &quot;behavior&quot;}, &quot;feeding&quot;]}, {&quot;&gt;&gt;&#x3D;&quot;: [{&quot;var&quot;: &quot;timestamp&quot;}, 1769124135]}]}
&#x60;&#x60;&#x60;`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.array(TrackingData),
  },
  {
    method: "get",
    path: "/hls/:filename",
    alias: "hls_retrieve",
    description: `Serve an HLS &#x60;.m3u8&#x60; playlist or &#x60;.ts&#x60; segment from the storage directory.`,
    requestFormat: "json",
    parameters: [
      {
        name: "filename",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 404,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
]);

export const api = new Zodios(
  "http://70.69.192.6:29831/",
  endpoints
);

setupApiInterceptors();

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
