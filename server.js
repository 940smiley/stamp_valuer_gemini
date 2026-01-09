
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './middleware/logger';
import { usageLimiter } from './middleware/usageLimiter';
import { errorHandler } from './middleware/errorHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(logger);
app.use(usageLimiter);
const port = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Handle SPA routing - return index.html for any unknown path
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware (must be after routes)
app.use(errorHandler);

// Only listen if run directly
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server started on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

// Export for Cloud Function targets (e.g. Google Cloud Functions http entry point)
export const stamplicityApp = app;
