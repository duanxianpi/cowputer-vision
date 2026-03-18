import { FC } from "react";

interface CPBrandProps {
    textClassName?: string;
    whiteVariant?: boolean;
}

const CPBrand: FC<CPBrandProps> = ({ whiteVariant, textClassName, ...rest }) => {
    return (
        <div className={`flex items-center font-brand ${textClassName ? textClassName : 'text-2xl'}`} {...rest}>
            <span className={`font-bold ${whiteVariant ? "text-white": "text-black"}`}>COW</span>
            <span className="font-bold text-green-600">PUTER</span>
        </div>
    );
};

export default CPBrand;