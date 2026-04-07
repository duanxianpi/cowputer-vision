import React from "react";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: React.ReactNode;
};

export default function NextLinkMock({ href, children, ...props }: AnchorProps) {
  return React.createElement("a", { href, ...props }, children);
}
