/**
 * Recursive sanitizer to protect against NoSQL Injection attacks.
 * Strips any object keys starting with '$' or containing '.' in req.body, req.query, and req.params.
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (val) => {
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        val[i] = sanitize(val[i]);
      }
    } else if (val !== null && typeof val === 'object') {
      for (const key in val) {
        if (key.startsWith('$') || key.includes('.')) {
          delete val[key];
        } else {
          val[key] = sanitize(val[key]);
        }
      }
    }
    return val;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};
