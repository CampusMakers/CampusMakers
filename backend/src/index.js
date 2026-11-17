import { httpServerHandler } from "cloudflare:node";
import app from "./app.js";

// Cloudflare Workers entry point. The Express app listens on a virtual port
// and httpServerHandler routes each incoming Worker request to it.
const PORT = 4000;

app.listen(PORT);

export default httpServerHandler({ port: PORT });
