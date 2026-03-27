"use client";

import React from "react";
import QueryBuilder, {
  type RuleGroupType,
  type RuleType,
  type Field,
  type ValueEditorProps,
} from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";

// ── Behavior options ─────────────────────────────────────────
const BEHAVIOR_OPTIONS = [
  { name: "feeding_head_down", label: "Feeding (Head Down)" },
  { name: "feeding_head_up", label: "Feeding (Head Up)" },
  { name: "walking", label: "Walking" },
  { name: "standing", label: "Standing" },
  { name: "lying", label: "Lying" },
];

// ── Single combined field ────────────────────────────────────
// Value format: "behavior:amount:unit"  e.g. "lying:30:minutes"
const fields: Field[] = [
  {
    name: "behavior_duration",
    label: "Behavior",
    operators: [{ name: "lasting_gt", label: "lasting for more than" }],
    defaultValue: "feeding_head_down:0:seconds",
  },
];

// ── Value helpers ────────────────────────────────────────────
function parseComboValue(val: string): [string, number, string] {
  if (!val || typeof val !== "string") return ["feeding_head_down", 0, "seconds"];
  const parts = val.split(":");
  const behavior = parts[0] || "feeding_head_down";
  const amount = Number(parts[1]) || 0;
  const unit = parts[2] === "minutes" ? "minutes" : "seconds";
  return [behavior, amount, unit];
}

function toSeconds(amount: number, unit: string): number {
  return unit === "minutes" ? amount * 60 : amount;
}

// ── Custom value editor ──────────────────────────────────────
const inputClass =
  "px-2 py-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#82A781] focus:border-[#82A781]";

function ComboEditor({ value, handleOnChange }: ValueEditorProps) {
  const [behavior, amount, unit] = parseComboValue(value);
  const update = (b: string, a: number | string, u: string) =>
    handleOnChange(`${b}:${a}:${u}`);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <select
        value={behavior}
        onChange={(e) => update(e.target.value, amount, unit)}
        className={inputClass}
      >
        {BEHAVIOR_OPTIONS.map((v) => (
          <option key={v.name} value={v.name}>
            {v.label}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">lasting for more than</span>
      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => update(behavior, e.target.value, unit)}
        className={`w-20 ${inputClass}`}
      />
      <select
        value={unit}
        onChange={(e) => update(behavior, amount, e.target.value)}
        className={inputClass}
      >
        <option value="seconds">seconds</option>
        <option value="minutes">minutes</option>
      </select>
    </div>
  );
}

function CustomValueEditor(props: ValueEditorProps) {
  return <ComboEditor {...props} />;
}

// ── Query ↔ JsonLogic conversion ─────────────────────────────

export function queryToJsonLogic(query: RuleGroupType): object | null {
  const conditions = query.rules
    .map((rule) => {
      if ("combinator" in rule) {
        return queryToJsonLogic(rule as RuleGroupType);
      }
      const r = rule as RuleType;
      const [behavior, amount, unit] = parseComboValue(r.value);
      const durationSec = toSeconds(amount, unit);
      return {
        and: [
          { "==": [{ var: "behavior" }, behavior] },
          { ">": [{ var: "duration" }, durationSec] },
        ],
      };
    })
    .filter(Boolean);

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return { [query.combinator]: conditions };
}

export function jsonLogicToQuery(logic: unknown): RuleGroupType {
  const empty: RuleGroupType = { combinator: "and", rules: [] };
  if (!logic || typeof logic !== "object") return empty;

  const obj = logic as Record<string, unknown>;
  const operator = Object.keys(obj)[0];

  if (operator === "and" || operator === "or") {
    const items = obj[operator];
    if (!Array.isArray(items)) return empty;

    // Check if this is a single combo rule (and with behavior + duration)
    const parsed = tryParseComboRule(obj);
    if (parsed) return { combinator: "and", rules: [parsed] };

    return {
      combinator: operator,
      rules: items.map((item: Record<string, unknown>) => {
        const combo = tryParseComboRule(item);
        if (combo) return combo;
        const op = Object.keys(item)[0];
        if (op === "and" || op === "or") return jsonLogicToQuery(item);
        return fallbackRule();
      }),
    };
  }

  return empty;
}

function tryParseComboRule(logic: Record<string, unknown>): RuleType | null {
  const op = Object.keys(logic)[0];
  if (op !== "and") return null;
  const items = logic[op];
  if (!Array.isArray(items) || items.length !== 2) return null;

  let behavior: string | null = null;
  let durationSec: number | null = null;

  for (const item of items) {
    const key = Object.keys(item)[0];
    const args = item[key];
    if (!Array.isArray(args) || args.length !== 2) return null;
    const [left, right] = args;
    const varName =
      left && typeof left === "object" && "var" in left
        ? (left as { var: string }).var
        : null;
    if (varName === "behavior" && key === "==") behavior = String(right);
    if (varName === "duration" && key === ">") durationSec = Number(right);
  }

  if (behavior === null || durationSec === null) return null;
  return {
    field: "behavior_duration",
    operator: "lasting_gt",
    value: `${behavior}:${durationSec}:seconds`,
  };
}

function fallbackRule(): RuleType {
  return { field: "behavior_duration", operator: "lasting_gt", value: "feeding_head_down:0:seconds" };
}

// ── Default empty query ──────────────────────────────────────
export const defaultQuery: RuleGroupType = { combinator: "and", rules: [] };

// ── Component ────────────────────────────────────────────────
interface Props {
  query: RuleGroupType;
  onChange: (query: RuleGroupType) => void;
}

export default function ConditionQueryBuilder({ query, onChange }: Props) {
  return (
    <div className="condition-query-builder">
      <QueryBuilder
        fields={fields}
        query={query}
        onQueryChange={onChange}
        combinators={[
          { name: "and", label: "AND" },
          { name: "or", label: "OR" },
        ]}
        controlClassnames={{
          queryBuilder: "!bg-gray-50 rounded-lg !border border-gray-200 !p-3",
          combinators: inputClass,
          addRule:
            "!px-2 !py-1 !text-sm font-medium !text-[#82A781] !border !border-[#82A781] !rounded-md hover:!bg-[#82A781] hover:!text-white transition-colors !bg-transparent",
          removeRule:
            "!px-1.5 !py-0.5 !text-sm !text-red-400 hover:!text-red-600 transition-colors",
          ruleGroup: "!border-none !bg-transparent",
          fields: "!hidden",
          operators: "!hidden",
          value: inputClass,
        }}
        controlElements={{
          valueEditor: CustomValueEditor,
          addGroupAction: null,
        }}
      />
    </div>
  );
}
