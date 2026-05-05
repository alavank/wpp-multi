import { buildServer } from "./server.js";

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3333);

async function main() {
  const app = await buildServer();
  await app.listen({ host, port });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
