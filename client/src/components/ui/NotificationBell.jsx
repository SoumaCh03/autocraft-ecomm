import { Bell } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const { unreadCount, notifications } = useNotifications();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setDropdownOpen(p => !p)}
        className="relative p-2 text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[600px] glass rounded-2xl shadow-2xl shadow-black/50 border border-dark-border overflow-hidden flex flex-col z-50"
          >
            <NotificationDropdown
              notifications={notifications}
              onClose={() => setDropdownOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {dropdownOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
          aria-label="Close notifications"
        />
      )}
    </div>
  );
}
