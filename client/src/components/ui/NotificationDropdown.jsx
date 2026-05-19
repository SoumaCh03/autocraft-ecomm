import { CheckCircle2, Trash2, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const notificationIcons = {
  new_order: '📦',
  order_shipped: '🚚',
  order_delivered: '✅',
  low_stock: '⚠️',
  back_in_stock: '📈',
  return_request: '↩️',
  coupon_expiry: '⏰',
};

const notificationColors = {
  new_order: 'bg-blue-500/10 border-blue-500/20',
  order_shipped: 'bg-yellow-500/10 border-yellow-500/20',
  order_delivered: 'bg-green-500/10 border-green-500/20',
  low_stock: 'bg-red-500/10 border-red-500/20',
  back_in_stock: 'bg-green-500/10 border-green-500/20',
  return_request: 'bg-orange-500/10 border-orange-500/20',
  coupon_expiry: 'bg-purple-500/10 border-purple-500/20',
};

export default function NotificationDropdown({ notifications, onClose }) {
  const { markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications();
  const { user } = useAuth();

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-dark-text flex items-center gap-2">
          <Bell size={16} /> Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => {
              markAllAsRead();
              onClose();
            }}
            className="text-xs text-primary-500 hover:text-primary-400 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-dark-muted text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {notifications.map((notif) => (
              <motion.div
                key={notif._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 border-l-4 ${notificationColors[notif.type] || 'bg-dark-card/50'} transition-colors hover:bg-dark-border/50 cursor-pointer relative group`}
                onClick={() => !notif.read && markAsRead(notif._id)}
              >
                <div className="flex gap-3">
                  <span className="text-lg flex-shrink-0">
                    {notificationIcons[notif.type] || '🔔'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-dark-text truncate">
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>

                    <p className="text-xs text-dark-muted mt-1 line-clamp-2">
                      {notif.message}
                    </p>

                    <p className="text-xs text-dark-muted/60 mt-2">
                      {getTimeAgo(notif.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-dark-muted hover:text-red-400"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
