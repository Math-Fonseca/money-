import express from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para parsing JSON
app.use(express.json());

// Middleware para parsing de formulários
app.use(express.urlencoded({ extended: true }));

// Registrar rotas da API
registerRoutes(app);

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 API endpoints available at http://localhost:${PORT}/api/*`);
});
