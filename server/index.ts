import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './database';

import authRouter from './routes/auth';
import clientsRouter from './routes/clients';
import servicesRouter from './routes/services';
import proposalsRouter from './routes/proposals';
import contractsRouter from './routes/contracts';
import contractTemplatesRouter from './routes/contractTemplates';
import settingsRouter from './routes/settings';
import dashboardRouter from './routes/dashboard';
import financialRouter from './routes/financial';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3005);

// Initialize SQLite database and seeds
initDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/contract-templates', contractTemplatesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/financial', financialRouter);

// Start server with Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: 24680 }
      },
      appType: 'spa',
    });
    // Vite middleware serves HTML, CSS, React components, and HMR
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  Credencia Orçamentos Server ativo com sucesso!`);
    console.log(`  Acesse: http://localhost:${PORT}`);
    console.log(`  Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar o servidor Credencia Orçamentos:', err);
});
