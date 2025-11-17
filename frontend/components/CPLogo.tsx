'use client';

import { FC } from "react";
import logo from "@/public/images/logo.svg";
import Image from "next/image";

const CPLogo: FC = () => {
    return (
        <div>
            <Image src={logo} alt="Cowputer Logo" className="h-full w-auto" />
        </div>
    );
};

export default CPLogo;