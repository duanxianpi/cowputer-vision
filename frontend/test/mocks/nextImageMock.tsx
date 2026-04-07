import React from "react";

type ImgProps = React.ImgHTMLAttributes<HTMLImageElement>;

export default function NextImageMock(props: ImgProps) {
  return React.createElement("img", props);
}
