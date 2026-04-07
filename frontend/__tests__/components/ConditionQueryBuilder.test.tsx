jest.mock("react-querybuilder", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement("div", { "data-testid": "query-builder" }),
  };
});

import { render, screen } from "@testing-library/react";
import ConditionQueryBuilder, {
  queryToJsonLogic,
  jsonLogicToQuery,
  defaultQuery,
} from "@/components/ConditionQueryBuilder";

describe("queryToJsonLogic", () => {
  it("returns null for empty rules", () => {
    expect(queryToJsonLogic({ combinator: "and", rules: [] })).toBeNull();
  });

  it("converts a single rule with seconds", () => {
    const result = queryToJsonLogic({
      combinator: "and",
      rules: [
        {
          field: "behavior_duration",
          operator: "lasting_gt",
          value: "walking:30:seconds",
        },
      ],
    });
    expect(result).toEqual({
      and: [
        { "==": [{ var: "behavior" }, "walking"] },
        { ">": [{ var: "duration" }, 30] },
      ],
    });
  });

  it("converts minutes to seconds", () => {
    const result = queryToJsonLogic({
      combinator: "and",
      rules: [
        {
          field: "behavior_duration",
          operator: "lasting_gt",
          value: "lying:2:minutes",
        },
      ],
    });
    expect(result).toEqual({
      and: [
        { "==": [{ var: "behavior" }, "lying"] },
        { ">": [{ var: "duration" }, 120] },
      ],
    });
  });

  it("handles empty/invalid combo value", () => {
    const result = queryToJsonLogic({
      combinator: "and",
      rules: [
        { field: "behavior_duration", operator: "lasting_gt", value: "" },
      ],
    });
    expect(result).toEqual({
      and: [
        { "==": [{ var: "behavior" }, "feeding_head_down"] },
        { ">": [{ var: "duration" }, 0] },
      ],
    });
  });

  it("handles non-string value", () => {
    const result = queryToJsonLogic({
      combinator: "and",
      rules: [
        { field: "behavior_duration", operator: "lasting_gt", value: null as any },
      ],
    });
    expect(result).toEqual({
      and: [
        { "==": [{ var: "behavior" }, "feeding_head_down"] },
        { ">": [{ var: "duration" }, 0] },
      ],
    });
  });

  it("combines multiple rules with OR", () => {
    const result = queryToJsonLogic({
      combinator: "or",
      rules: [
        { field: "behavior_duration", operator: "lasting_gt", value: "walking:10:seconds" },
        { field: "behavior_duration", operator: "lasting_gt", value: "lying:30:seconds" },
      ],
    });
    expect(result).toEqual({
      or: [
        { and: [{ "==": [{ var: "behavior" }, "walking"] }, { ">": [{ var: "duration" }, 10] }] },
        { and: [{ "==": [{ var: "behavior" }, "lying"] }, { ">": [{ var: "duration" }, 30] }] },
      ],
    });
  });

  it("recurses into nested groups", () => {
    const result = queryToJsonLogic({
      combinator: "and",
      rules: [
        {
          combinator: "or",
          rules: [
            { field: "behavior_duration", operator: "lasting_gt", value: "standing:5:seconds" },
            { field: "behavior_duration", operator: "lasting_gt", value: "walking:10:seconds" },
          ],
        },
      ],
    });
    expect(result).toEqual({
      or: [
        { and: [{ "==": [{ var: "behavior" }, "standing"] }, { ">": [{ var: "duration" }, 5] }] },
        { and: [{ "==": [{ var: "behavior" }, "walking"] }, { ">": [{ var: "duration" }, 10] }] },
      ],
    });
  });

  it("handles partial combo value with missing parts", () => {
    const result = queryToJsonLogic({
      combinator: "and",
      rules: [
        { field: "behavior_duration", operator: "lasting_gt", value: "walking" },
      ],
    });
    // parseComboValue("walking") => ["walking", 0, "seconds"]
    expect(result).toEqual({
      and: [
        { "==": [{ var: "behavior" }, "walking"] },
        { ">": [{ var: "duration" }, 0] },
      ],
    });
  });
});

describe("jsonLogicToQuery", () => {
  it("returns empty for null/undefined", () => {
    expect(jsonLogicToQuery(null)).toEqual({ combinator: "and", rules: [] });
    expect(jsonLogicToQuery(undefined)).toEqual({ combinator: "and", rules: [] });
  });

  it("returns empty for non-object", () => {
    expect(jsonLogicToQuery("string")).toEqual({ combinator: "and", rules: [] });
    expect(jsonLogicToQuery(42)).toEqual({ combinator: "and", rules: [] });
  });

  it("returns empty for unknown operators", () => {
    expect(jsonLogicToQuery({ ">": [5, 3] })).toEqual({ combinator: "and", rules: [] });
  });

  it("returns empty for non-array operand", () => {
    expect(jsonLogicToQuery({ and: "not-array" })).toEqual({ combinator: "and", rules: [] });
  });

  it("parses a single combo rule (and with behavior+duration)", () => {
    const logic = {
      and: [
        { "==": [{ var: "behavior" }, "walking"] },
        { ">": [{ var: "duration" }, 30] },
      ],
    };
    const result = jsonLogicToQuery(logic);
    expect(result.rules).toHaveLength(1);
    const rule = result.rules[0] as any;
    expect(rule.field).toBe("behavior_duration");
    expect(rule.operator).toBe("lasting_gt");
    expect(rule.value).toBe("walking:30:seconds");
  });

  it("parses OR group of combo rules", () => {
    const logic = {
      or: [
        { and: [{ "==": [{ var: "behavior" }, "walking"] }, { ">": [{ var: "duration" }, 10] }] },
        { and: [{ "==": [{ var: "behavior" }, "lying"] }, { ">": [{ var: "duration" }, 60] }] },
      ],
    };
    const result = jsonLogicToQuery(logic);
    expect(result.combinator).toBe("or");
    expect(result.rules).toHaveLength(2);
  });

  it("falls back for non-combo non-group items", () => {
    const logic = {
      and: [
        { "!=": [{ var: "x" }, 5] },
      ],
    };
    const result = jsonLogicToQuery(logic);
    expect(result.rules).toHaveLength(1);
    const rule = result.rules[0] as any;
    expect(rule.field).toBe("behavior_duration");
    expect(rule.value).toBe("feeding_head_down:0:seconds");
  });

  it("recurses into nested and/or groups", () => {
    const logic = {
      and: [
        {
          or: [
            { and: [{ "==": [{ var: "behavior" }, "walking"] }, { ">": [{ var: "duration" }, 5] }] },
          ],
        },
      ],
    };
    const result = jsonLogicToQuery(logic);
    expect(result.rules).toHaveLength(1);
    const innerGroup = result.rules[0] as any;
    expect(innerGroup.combinator).toBe("or");
  });

  it("handles incomplete combo rule (missing duration)", () => {
    const logic = {
      and: [
        { "==": [{ var: "behavior" }, "walking"] },
      ],
    };
    const result = jsonLogicToQuery(logic);
    // items.length !== 2, so tryParseComboRule returns null
    // then per-item: tryParseComboRule on single item also fails
    // "==" is not "and"/"or", so fallbackRule
    expect(result.rules).toHaveLength(1);
  });

  it("handles combo with non-array args", () => {
    const logic = {
      and: [
        { "==": "not-an-array" },
        { ">": [{ var: "duration" }, 30] },
      ],
    };
    // tryParseComboRule: first item args not array → returns null
    // Falls to per-item mapping
    const result = jsonLogicToQuery(logic);
    expect(result.rules).toHaveLength(2);
  });
});

describe("defaultQuery", () => {
  it("is an empty AND group", () => {
    expect(defaultQuery).toEqual({ combinator: "and", rules: [] });
  });
});

describe("ConditionQueryBuilder component", () => {
  it("renders the query builder", () => {
    render(<ConditionQueryBuilder query={defaultQuery} onChange={jest.fn()} />);
    expect(screen.getByTestId("query-builder")).toBeInTheDocument();
  });
});
