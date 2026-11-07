import cors from "cors";
import express from "express";
import helmet from "helmet";
import config from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { loadSession } from "./middleware/session.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(
    cors({
        origin: config.clientOrigins,
        credentials: true,
        exposedHeaders: ["set-auth-token", "Location"]
    })
);

app.use("/api/auth", authRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(loadSession);
app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
