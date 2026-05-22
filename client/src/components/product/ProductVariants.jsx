import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const DEFAULT_COLORS = {
  black: '#111111',
  white: '#f5f5f5',
  beige: '#D6C6A5',
  tan: '#B8865B',
  brown: '#7B4B2A',
  grey: '#808080',
  gray: '#808080',
  silver: '#BFC5CC',
  red: '#D32F2F',
  blue: '#2962FF',
  green: '#2E7D32',
  yellow: '#FBC02D',
  orange: '#F57C00',
}

export default function ProductVariants({
  variants,
  selectedVariantId,
  onVariantSelect,
}) {
  if (!variants?.length) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-primary-500 font-medium uppercase tracking-[0.2em]">
            Select Variant
          </p>

          <h3 className="text-sm text-dark-muted mt-1">
            Choose your preferred option
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isSelected =
            selectedVariantId === variant._id

          const isOut =
            Number(variant.stock || 0) <= 0

          const colorHex =
            variant.colorHex ||
            DEFAULT_COLORS[
              variant.color?.toLowerCase()
            ] ||
            null

          return (
            <motion.button
              key={variant._id}
              type="button"
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2 }}
              onClick={() =>
                !isOut &&
                onVariantSelect(variant)
              }
              disabled={isOut}
              className={`
                relative
                group
                min-w-[140px]
                rounded-2xl
                border
                transition-all
                duration-300
                overflow-hidden
                backdrop-blur-md
                px-4 py-3
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_28px_rgba(59,107,255,0.16)]'
                    : 'border-dark-border bg-dark-card hover:border-primary-500/30'
                }
                ${
                  isOut
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }
              `}
            >
              {/* Glow */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5" />
              )}

              <div className="relative flex items-start gap-3">
                {/* Color Swatch */}
                {colorHex ? (
                  <div
                    className={`
                      w-10 h-10 rounded-full
                      border shrink-0
                      relative overflow-hidden
                      ${
                        isSelected
                          ? 'border-primary-500'
                          : 'border-white/10'
                      }
                    `}
                    style={{
                      backgroundColor: colorHex,
                    }}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check
                          size={14}
                          className="text-white"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`
                      px-3 py-1 rounded-xl
                      text-xs font-medium
                      border shrink-0
                      ${
                        isSelected
                          ? 'border-primary-500 text-primary-400'
                          : 'border-dark-border text-dark-muted'
                      }
                    `}
                  >
                    Type
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 text-left">
                  <p
                    className={`
                      text-sm font-semibold
                      ${
                        isSelected
                          ? 'text-primary-400'
                          : 'text-dark-text'
                      }
                    `}
                  >
                    {variant.name}
                  </p>

                  {variant.color && (
                    <p className="text-xs text-dark-muted mt-0.5">
                      {variant.color}
                    </p>
                  )}

                  <div className="mt-1">
                    {isOut ? (
                      <span className="text-[11px] text-red-400">
                        Out of Stock
                      </span>
                    ) : Number(variant.stock) <= 5 ? (
                      <span className="text-[11px] text-amber-400">
                        Only {variant.stock} left
                      </span>
                    ) : (
                      <span className="text-[11px] text-green-400">
                        In Stock
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

