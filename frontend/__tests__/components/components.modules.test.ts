type ComponentModuleCase = {
  modulePath: string;
  expectedNamedExports?: string[];
  expectDefault?: boolean;
};

const componentModules: ComponentModuleCase[] = [
  { modulePath: "@/components/CPInput", expectDefault: true },
  { modulePath: "@/components/CPButton", expectDefault: true },
  { modulePath: "@/components/CPBrand", expectDefault: true },
  { modulePath: "@/components/ConditionQueryBuilder", expectDefault: true },
  { modulePath: "@/components/CPModal", expectDefault: true },
  { modulePath: "@/components/CPLogo", expectDefault: true },
  { modulePath: "@/components/CPPageHeader", expectDefault: true },
  { modulePath: "@/components/CPTextarea", expectDefault: true },
  { modulePath: "@/components/CPVideoWithBBox", expectDefault: true },
  { modulePath: "@/components/modal/AlertModal", expectDefault: true },
  { modulePath: "@/components/modal/ReportModal", expectDefault: true },
  { modulePath: "@/components/visualizations/CPStackAreaPlot", expectDefault: true },
  { modulePath: "@/components/visualizations/CPDoughnutPlot", expectDefault: true },
  { modulePath: "@/components/visualizations/CPCowBehaviorChart", expectDefault: true },
  { modulePath: "@/components/providers/AuthProvider", expectedNamedExports: ["RequireAuth"] },
  { modulePath: "@/components/providers/QueryProvider", expectedNamedExports: ["Providers"] },
];

describe("all components", () => {
  it.each(componentModules)("loads %s", ({ modulePath, expectDefault, expectedNamedExports }) => {
    const mod = require(modulePath);

    if (expectDefault) {
      expect(typeof mod.default).toBe("function");
    }

    if (expectedNamedExports?.length) {
      for (const exportName of expectedNamedExports) {
        expect(typeof mod[exportName]).toBe("function");
      }
    }
  });
});
