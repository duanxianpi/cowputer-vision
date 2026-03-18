'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import pattern11 from "@/public/images/pattern_1_1.svg";
import pattern12 from "@/public/images/pattern_1_2.svg";
import pattern21 from "@/public/images/pattern_2_1.svg";
import pattern22 from "@/public/images/pattern_2_2.svg";
import CPBrand from '@/components/CPBrand';
import CPLogo from '@/components/CPLogo';

export default function AuthBackground() {
    return (
        <>
            <div className="h-full">
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="fixed top-0 left-0 h-full w-auto"
                >
                    <Image src={pattern12} alt="Pattern 2" className='h-full w-auto object-cover' />
                </motion.div>

                <Image src={pattern11} alt="Pattern 1" className='fixed top-0 left-0 h-full w-auto object-cover' />
                <div className='relative flex flex-col w-[50%] items-center'>
                    <div className='text-white text-2xl mb-2 pt-40'>
                        WELCOME TO
                    </div>
                    {/* <div className="h-16 w-16 my-4">
                        <CPLogo />
                    </div> */}
                    <CPBrand whiteVariant={true} textClassName="text-6xl" />
                    <div className='text-white text-lg font-light'>
                        Your Window to Herd Health
                    </div>
                </div>
            </div>
            <div className="h-full">
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="fixed bottom-0 right-0 h-[28%] w-auto"
                >
                    <Image src={pattern22} alt="Pattern 2" className='h-full w-auto object-cover' />
                </motion.div>

                <Image src={pattern21} alt="Pattern 1" className='fixed bottom-0 right-0 h-[30%] w-auto object-cover' />
            </div>
        </>
    );
}