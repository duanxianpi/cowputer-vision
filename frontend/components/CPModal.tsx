"use client";

import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CPModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode; // 弹窗的具体内容
  maxWidth?: string; // 允许自定义宽度，默认为 2xl
}

// 定义动画参数（Variants）
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20 // 进场时带有轻微向上滑动的效果
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring", // 使用弹簧动画，更自然
      stiffness: 300, 
      damping: 25 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.2, ease: "easeOut" } // 退场要快一点
  },
};

export default function CPModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
}: CPModalProps) {

  // 快捷键支持：按下 Esc 键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      // 弹窗打开时阻止背景滚动
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      // 弹窗关闭时恢复背景滚动
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    // AnimatePresence 负责管理在其内部组件卸载时的动画
    <AnimatePresence>
      {isOpen && (
        // 1. 动画背景 (Overlay)
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          // 点击背景关闭 Modal
          onClick={onClose}
        >
          {/* 2. 动画弹窗实体 (Panel) */}
          <motion.div
            className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            // 阻止点击弹窗内部冒泡导致弹窗关闭
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (这里会渲染传入的 children) */}
            {/* 我们保留一个滚动区域的逻辑在外壳中，确保内容过多时不会撑破 */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}