import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";

// Load the Worker's settings (wrangler.jsonc "vars" plus .dev.vars, both at the
// project root) into process.env so these Node scripts match the Worker.
const proxy = await getPlatformProxy({
    configPath: fileURLToPath(new URL("../../wrangler.jsonc", import.meta.url))
});
for (const [name, value] of Object.entries(proxy.env)) {
    if (typeof value === "string" && process.env[name] === undefined) process.env[name] = value;
}
await proxy.dispose();
