
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Handle SPA routing - return index.html for any unknown path
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Only listen if run directly (not if imported as a module for Function targets)
// In a container (Dockerfile) or Procfile, this will run.
if (process.env.NODE_ENV !== 'test' && !process.env.FUNCTION_TARGET) {
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}

// Export for Cloud Function targets (e.g. Google Cloud Functions http entry point)
export const stamplicityApp = app;
