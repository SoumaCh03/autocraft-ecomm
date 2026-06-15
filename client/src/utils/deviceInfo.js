/**
 * Generates a unique UUID v4.
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Gets or creates a persistent Device ID.
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('autocraft_device_id');
  if (!deviceId) {
    deviceId = `dev_${generateUUID().slice(0, 18)}`;
    localStorage.setItem('autocraft_device_id', deviceId);
  }
  return deviceId;
};

/**
 * Gets or creates a Session ID that expires when the tab is closed.
 */
export const getSessionId = () => {
  let sessionId = sessionStorage.getItem('autocraft_session_id');
  if (!sessionId) {
    sessionId = `sess_${generateUUID().slice(0, 18)}`;
    sessionStorage.setItem('autocraft_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Extracts human-readable browser, OS, and platform information.
 */
export const getDeviceDetails = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let platform = navigator.platform || 'Unknown Platform';

  // Extract browser name
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  // Extract operating system
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    deviceId: getDeviceId(),
    sessionId: getSessionId(),
    browser,
    os,
    platform
  };
};
