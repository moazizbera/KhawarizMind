import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Github, Play } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center text-center bg-gradient-to-b from-black via-blue-950 to-blue-900 text-white px-6 py-24 overflow-hidden">
      <motion.h1
        className="relative z-10 text-4xl sm:text-6xl md:text-7xl font-extrabold mb-6 tracking-tight drop-shadow-lg"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Welcome to <span className="text-blue-400">KhawarizMind</span>
      </motion.h1>
    </section>
  );
}
