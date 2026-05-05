import { buildServer } from "./server.js";
import { env } from "./lib/env.js";
import { startScheduledReturnsWorker } from "./workers/scheduled-returns.worker.js";

async function main() {
  const app = await buildServer();
  const stopWorker = startScheduledReturnsWorker(app.log);
  app.addHook("onClose", async () => {
    stopWorker();
  });
  // Railway/Heroku/Fly injetam PORT; localmente caímos para API_PORT (default 3333).
  const port = Number(process.env.PORT ?? env.API_PORT);
  await app.listen({ host: env.API_HOST, port });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
