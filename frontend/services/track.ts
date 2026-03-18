import { api } from "@/api/client";

export const trackService = {
  fetchTracks: (filter: { behavior?: string[]; cowId?: string; sinceTimestamp?: number }) => {
    const rules: any[] = [];

    if (filter.behavior) {
      rules.push({ "in": [{ var: "behavior" }, filter.behavior] });
    }

    if (filter.sinceTimestamp) {
      rules.push({ ">=": [{ var: "timestamp" }, filter.sinceTimestamp] });
    }

    if (filter.cowId) {
      rules.push({ "==": [{ var: "cow_id" }, filter.cowId] });
    }

    const body = rules.length === 1 ? rules[0] : { and: rules };
    return api.api_tracks_create(body);
  },

  fetchTracksWindow: async (startMs: number, endMs: number) => {
    return api.api_tracks_create({
      and: [
        { ">=": [{ var: "timestamp" }, startMs] },
        { "<=": [{ var: "timestamp" }, endMs] },
      ],
    });
  },
};