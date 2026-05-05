import { buildServer } from "./server.js";
import { env } from "./lib/env.js";
import { startScheduledReturnsWorker } from "./workers/scheduled-returns.worker.js";

async function main() {
  const app = await buildServer();
  const stopWorker = startScheduledReturnsWorker(app.log);
  app.addHook("onClose", async () => {
    stopWorker();
  });
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
