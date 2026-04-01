import { createClient, type Client } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

let _client: Client | null = null;

export function createDbClient(dbPath: string): Client {
  if (_client) return _client;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  _client = createClient({ url: `file:${dbPath}` });

  // Restrict DB file permissions — contains OAuth tokens
  if (fs.existsSync(dbPath)) {
    fs.chmodSync(dbPath, 0o600);
  }

  return _client;
}

export function createInMemoryClient(): Client {
  return createClient({ url: ":memory:" });
}

export function resetClient(): void {
  _client = null;
}
