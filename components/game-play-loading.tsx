"use client";

import { motion } from "framer-motion";
import { RiGamepadLine } from "react-icons/ri";
import {
  loadingVariants,
  microInteractionVariants,
} from "@/lib/animations/private-lobby-variants";

export function GamePlayLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-6 p-8"
        variants={microInteractionVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30"
          variants={loadingVariants}
          animate="animate"
        >
          <RiGamepadLine className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
            Loading game...
          </h2>
          <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
            Preparing your meme battle
          </p>
        </div>
      </motion.div>
    </div>
  );
}
