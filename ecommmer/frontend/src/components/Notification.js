import React, { useState, useEffect } from 'react';

const NotificationContext = React.createContext();

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type };
    
    setNotifications((prev) => [...prev, notification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationContainer notifications={notifications} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = ({ notifications }) => {
  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Trigger exit animation before removal
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <div
      className={`
        ${getBackgroundColor()}
        text-white
        px-6
        py-4
        rounded-lg
        shadow-2xl
        min-w-[300px]
        max-w-[400px]
        transform
        transition-all
        duration-300
        ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
      `}
      style={{
        animation: isVisible && !isExiting 
          ? 'slideInRight 0.3s ease-out forwards' 
          : isExiting 
          ? 'slideOutRight 0.3s ease-in forwards' 
          : 'none'
      }}
    >
      <div className="flex items-center gap-3">
        {notification.type === 'success' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {notification.type === 'error' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {notification.type === 'info' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {notification.type === 'warning' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <p className="font-semibold text-sm flex-1">{notification.message}</p>
      </div>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-slide-in {
          animation: slideInRight 0.3s ease-out forwards;
        }
        .animate-slide-out {
          animation: slideOutRight 0.3s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default NotificationProvider;


