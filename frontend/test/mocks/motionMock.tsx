import React from "react";

const handler: ProxyHandler<Record<string, unknown>> = {
  get(_target, prop: string) {
    return React.forwardRef(function MotionComponent(props: any, ref: any) {
      const {
        initial, animate, exit, transition,
        whileHover, whileTap, whileFocus, whileDrag, whileInView,
        variants, layout, layoutId, drag, dragConstraints,
        onAnimationStart, onAnimationComplete,
        ...domProps
      } = props;
      return React.createElement(prop, { ...domProps, ref });
    });
  },
};

export const motion = new Proxy({} as any, handler);

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
