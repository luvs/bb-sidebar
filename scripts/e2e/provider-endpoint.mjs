import { createServer } from "node:http";

/**
 * A loopback stand-in for the OpenAI API, which the scratch Codex uses through
 * `openai_base_url`. It accepts every request and answers none, so a fixture's
 * empty turn waits on its first model request until `thread stop` interrupts it.
 *
 * Against api.openai.com an unauthenticated Codex gets 401 at once and logs a
 * provider error for each of its retries: the seed then saw provider errors, or
 * the thread ended in `error` instead of `idle`, whenever the turn started before
 * the stop landed. That depended on CPU speed and network latency to OpenAI.
 */
export async function startProviderEndpoint() {
  const sockets = new Set();
  const requests = [];
  const server = createServer((request) => {
    requests.push(`${request.method} ${request.url}`);
  });
  // Codex opens a WebSocket first; leave the upgrade unanswered as well.
  server.on("upgrade", (request) => {
    requests.push(`UPGRADE ${request.url}`);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  const { port } = server.address();
  return {
    port,
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requests,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((accept) => server.close(accept));
    },
  };
}
