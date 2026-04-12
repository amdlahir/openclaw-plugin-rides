import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryClient } from "../src/db/client";
import { runMigrations } from "../src/db/schema";
import { checkGmailSetupNotification } from "../src/hooks/gmailSetupNotification";
import type { Client } from "@libsql/client";

describe("gmail setup notification", () => {
  let db: Client;

  beforeEach(async () => {
    db = createInMemoryClient();
    await runMigrations(db);
  });

  it("returns a message when Gmail is not connected and not yet notified", async () => {
    const message = await checkGmailSetupNotification(db);
    expect(message).not.toBeNull();
    expect(message).toContain("Gmail");
  });

  it("returns null when Gmail is already connected", async () => {
    await db.execute({
      sql: "UPDATE sync_state SET email_sync_enabled = 1 WHERE id = 1",
      args: [],
    });

    const message = await checkGmailSetupNotification(db);
    expect(message).toBeNull();
  });

  it("returns null after first notification", async () => {
    const first = await checkGmailSetupNotification(db);
    expect(first).not.toBeNull();

    const second = await checkGmailSetupNotification(db);
    expect(second).toBeNull();
  });

  it("returns null when Gmail is connected even if not yet notified", async () => {
    await db.execute({
      sql: "UPDATE sync_state SET email_sync_enabled = 1 WHERE id = 1",
      args: [],
    });

    const message = await checkGmailSetupNotification(db);
    expect(message).toBeNull();

    const state = await db.execute({
      sql: "SELECT * FROM plugin_state WHERE key = 'gmail_setup_notified'",
      args: [],
    });
    expect(state.rows.length).toBe(0);
  });
});
