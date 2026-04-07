const pageModules = [
  "@/app/page",
  "@/app/reset-password/page",
  "@/app/reset-email/page",
  "@/app/auth/register/page",
  "@/app/auth/login/page",
  "@/app/auth/forgot-password/page",
  "@/app/dashboard/page",
  "@/app/dashboard/settings/page",
  "@/app/dashboard/reports/page",
  "@/app/dashboard/playback/page",
  "@/app/dashboard/live-camera/page",
  "@/app/dashboard/alerts/page",
  "@/app/dashboard/overview/page",
];

describe("all app pages", () => {
  it.each(pageModules)("%s exports a default page component", (modulePath) => {
    const mod = require(modulePath);
    expect(typeof mod.default).toBe("function");
  });
});
