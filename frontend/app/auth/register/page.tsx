"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterInput } from "@/schemas/register";
import { registerUser } from "@/services/auth";
import CPInput from "@/components/CPInput";
import CPButton from "@/components/CPButton";
import Image from 'next/image';
import { motion } from 'framer-motion';
import pattern11 from "@/public/images/pattern_1_1.svg";
import pattern12 from "@/public/images/pattern_1_2.svg";
import pattern21 from "@/public/images/pattern_2_1.svg";
import pattern22 from "@/public/images/pattern_2_2.svg";
import CPBrand from "@/components/CPBrand";
import CPLogo from "@/components/CPLogo";

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      const result = await registerUser(data);
      alert("Registered successfully!");
    } catch (err: any) {
      alert("Register failed: " + err.message);
    }
  };
  return (
    <div className="min-h-screen items-center justify-center">
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-[-200] h-full w-auto"
      >
        <Image src={pattern12} alt="Pattern 2" className='h-full w-auto' />
      </motion.div>

      <Image src={pattern11} alt="Pattern 1" className='fixed top-0 left-[-200] h-full w-auto' />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed bottom-0 right-0 h-[28%] w-auto"
      >
        <Image src={pattern22} alt="Pattern 2" className='h-full w-auto' />
      </motion.div>

      <Image src={pattern21} alt="Pattern 1" className='fixed bottom-0 right-0 h-[30%] w-auto' />

      <div className="flex min-h-screen flex-col items-end m-[5%]">
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md w-80">
          <div className="mt-6 h-12 w-12">
            <CPLogo />
          </div>
          <div>
            <CPBrand textClassName="text-4xl"/>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 flex flex-col">
            <CPInput {...register("email")} placeholder="Email" label="Email" />
            {errors.email && <div className="text-red-500">{errors.email.message}</div>}

            <CPInput {...register("username")} placeholder="Username" label="Username"/>
            {errors.username && <div className="text-red-500">{errors.username.message}</div>}

            <CPInput type="password" {...register("password")} placeholder="Password" label="Password"/>
            {errors.password && <div className="text-red-500">{errors.password.message}</div>}

            <CPButton label={isSubmitting ? "Registering..." : "Register"} type="submit" disabled={isSubmitting}>
            </CPButton>
          </form>
        </div>
      </div>
    </div>
  );
}
