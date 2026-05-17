export default function Skeleton({
  className = '',
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-dark-border/60
        ${className}
      `}
    >
      <div
        className="
          absolute inset-0
          -translate-x-full
          animate-[shimmer_1.8s_infinite]
          bg-gradient-to-r
          from-transparent
          via-white/10
          to-transparent
        "
      />
    </div>
  )
}

