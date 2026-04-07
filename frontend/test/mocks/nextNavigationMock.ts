const push = jest.fn();
const replace = jest.fn();

export const mockRouter = {
  push,
  replace,
  prefetch: jest.fn(),
};

export const useRouter = () => mockRouter;
export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const redirect = jest.fn();
