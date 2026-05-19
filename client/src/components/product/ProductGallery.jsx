import { motion } from 'framer-motion'

export default function ProductGallery({ images, currentIdx, onImageSelect, isOutOfStock, productName }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
      <div className="aspect-square rounded-2xl overflow-hidden bg-dark-card border border-dark-border mb-4 relative">
        {images?.[currentIdx] ? (
          <img src={images[currentIdx]} alt={productName} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-60 grayscale' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-muted/20 font-display text-6xl font-bold">AC</div>
        )}

        {isOutOfStock && (
          <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
            Out of Stock
          </div>
        )}
      </div>

      {images?.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button key={i} onClick={() => onImageSelect(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${currentIdx === i ? 'border-primary-500' : 'border-dark-border'}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
