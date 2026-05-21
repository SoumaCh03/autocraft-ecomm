import jwt from 'jsonwebtoken';

export const socketAuth = (socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie || '';

    const token =
      socket.handshake.auth?.token ||
      cookies
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

    if (!token) {
      return next(new Error('Authentication error: no token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    socket.userId = decoded.id;
    socket.userRole = decoded.role;

    next();
  } catch (err) {
    next(new Error(`Authentication error: ${err.message}`));
  }
};

