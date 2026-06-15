import { motion } from 'framer-motion'

const WHATSAPP_NUMBER = '+919614196176'
const MESSAGE = `Hi! I'm looking for assistance with AUTOCRAFT.`

export default function WhatsAppButton() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`

  return (
    <>
      <style>{`
        @keyframes wa-pulse {
          0%   { transform: scale(1);   opacity: 0.35; }
          70%  { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .wa-btn {
          position: fixed;
          bottom: 12px;
          right: 12px;
          z-index: 9999;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: #25D366;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 12px rgba(37,211,102,0.35);
          cursor: pointer;
          text-decoration: none;
        }
        .wa-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background-color: #25D366;
          opacity: 0.35;
          animation: wa-pulse 2.5s ease-out infinite;
          pointer-events: none;
        }
        @media (min-width: 768px) {
          .wa-btn {
            bottom: 16px;
            right: 16px;
            width: 48px;
            height: 48px;
          }
        }
        @media (min-width: 1024px) {
          .wa-btn {
            bottom: 24px;
            right: 24px;
          }
        }
      `}</style>

      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="wa-btn"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
      >
        <span className="wa-pulse" />
        <svg width="22" height="22" viewBox="0 0 32 32" fill="white">
          <path d="M16 2C8.28 2 2 8.28 2 16c0 2.46.66 4.77 1.8 6.77L2 30l7.43-1.77A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.44 11.44 0 01-5.84-1.6l-.42-.25-4.33 1.03 1.06-4.2-.27-.44A11.5 11.5 0 1116 27.5zm6.3-8.6c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17-.23.34-.9 1.11-1.1 1.34-.2.23-.4.26-.74.09-.34-.17-1.43-.53-2.73-1.68-1.01-.9-1.69-2.01-1.89-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.52-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.68-.57-.59-.78-.6h-.66c-.23 0-.6.09-.91.43-.32.34-1.2 1.17-1.2 2.86s1.23 3.32 1.4 3.55c.17.23 2.42 3.7 5.87 5.18.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.31-1.62.28-.8.28-1.48.2-1.62-.09-.14-.32-.23-.66-.4z"/>
        </svg>
      </motion.a>
    </>
  )
}