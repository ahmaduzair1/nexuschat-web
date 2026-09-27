import { motion } from 'framer-motion';

export default function LoadingScreen({ label = 'Loading Nexus…' }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-navy-bg px-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-3xl bg-emerald-primary/20 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-graphite-surface border border-emerald-primary/30 shadow-emerald">
          <span className="font-display text-3xl font-bold text-emerald-primary">N</span>
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-silver-muted"
      >
        {label}
      </motion.p>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-graphite-light">
        <motion.div
          className="h-full bg-emerald-grad"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
