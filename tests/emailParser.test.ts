import { describe, it, expect } from "vitest";
import { parseGrabReceipt, parseGojekReceipt } from "../src/parsers/emailParser";

describe("parseGrabReceipt", () => {
  const internalDate = "1711929600000"; // 2024-04-01

  it("extracts amount and locations from SGD receipt", () => {
    const body = "Grab E-Receipt\nTotal Paid\nSGD 15.50\nYour Trip\n2.5 km \n143 Pasir Ris Grove\n9:34PM\nBugis Junction\n9:50PM\nGrab Singapore";
    const result = parseGrabReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.amount).toBe(1550);
    expect(result.data.currency).toBe("SGD");
    expect(result.data.pickup).toBe("143 Pasir Ris Grove");
    expect(result.data.dropoff).toBe("Bugis Junction");
  });

  it("extracts amount from MYR receipt", () => {
    const body = "Grab E-Receipt\nTotal Paid\nRM12.50\nYour Trip\n5.0 km\nKLCC Tower\n2:00PM\nBukit Bintang Plaza\n2:20PM";
    const result = parseGrabReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.amount).toBe(1250);
    expect(result.data.currency).toBe("MYR");
    expect(result.data.pickup).toBe("KLCC Tower");
    expect(result.data.dropoff).toBe("Bukit Bintang Plaza");
  });

  it("extracts amount with SGD prefix", () => {
    const body = "Grab receipt\nFare: SGD 8.00";
    const result = parseGrabReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.amount).toBe(800);
    expect(result.data.currency).toBe("SGD");
  });

  it("skips non-Grab email", () => {
    const body = "Your Gojek trip receipt\nTotal: S$15.50";
    const result = parseGrabReceipt(body, internalDate);
    expect(result.status).toBe("skipped");
  });

  it("fails when no amount found", () => {
    const body = "Your Grab trip was completed. Thank you!";
    const result = parseGrabReceipt(body, internalDate);
    expect(result.status).toBe("failed");
  });

  it("skips non-receipt Grab email", () => {
    const body = "Grab promo: Use code SAVE50 for your next ride!";
    const result = parseGrabReceipt(body, internalDate);
    expect(result.status).toBe("skipped");
  });

  it("skips GrabFood receipt", () => {
    const body = "Grab E-Receipt\nGrabFood\nOrder Summary\nTotal: S$25.00\nDelivery Fee: S$3.00";
    const result = parseGrabReceipt(body, internalDate);
    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("GrabFood receipt");
    }
  });

  it("skips GrabMart receipt", () => {
    const body = "Grab E-Receipt\nGrabMart\nYour Order\nTotal: S$15.00";
    const result = parseGrabReceipt(body, internalDate);
    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("GrabMart receipt");
    }
  });

  it("uses internalDate as ride date", () => {
    const body = "Your Grab trip receipt\nTotal: S$10.00";
    const result = parseGrabReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.date).toBe(1711929600000);
  });

  it("calculates confidence based on extracted fields", () => {
    // With locations: base 0.5 + amount 0.2 + pickup 0.1 + dropoff 0.1 = 0.9
    const full = "Grab receipt\nTotal: S$10.00\nYour Trip\n2.5 km\nOrchard Road\n9:00PM\nBugis Street\n9:15PM";
    const fullResult = parseGrabReceipt(full, internalDate);
    expect(fullResult.status).toBe("parsed");
    if (fullResult.status === "parsed") {
      expect(fullResult.data.confidence).toBeCloseTo(0.9);
    }

    // Only amount: base 0.5 + amount 0.2 = 0.7
    const amountOnly = "Grab receipt\nTotal: S$10.00";
    const amountResult = parseGrabReceipt(amountOnly, internalDate);
    expect(amountResult.status).toBe("parsed");
    if (amountResult.status === "parsed") {
      expect(amountResult.data.confidence).toBe(0.7);
    }
  });
});

describe("parseGojekReceipt", () => {
  const internalDate = "1711929600000";

  it("extracts amount from SGD receipt", () => {
    const body = "Gojek trip receipt\nFare: S$8.50\nFrom: Marina Bay Sands\nDestination: Bugis Junction";
    const result = parseGojekReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.amount).toBe(850);
    expect(result.data.currency).toBe("SGD");
    expect(result.data.pickup).toBe("Marina Bay Sands");
    expect(result.data.dropoff).toBe("Bugis Junction");
  });

  it("recognizes GoRide receipt", () => {
    const body = "GoRide trip fare receipt\nTotal: $12.00";
    const result = parseGojekReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.amount).toBe(1200);
  });

  it("recognizes GoCar receipt", () => {
    const body = "GoCar trip receipt\nTotal: S$20.00";
    const result = parseGojekReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.amount).toBe(2000);
  });

  it("skips non-Gojek email", () => {
    const body = "Your Grab trip receipt\nTotal: S$15.50";
    const result = parseGojekReceipt(body, internalDate);
    expect(result.status).toBe("skipped");
  });

  it("fails when no amount found", () => {
    const body = "Your Gojek trip was completed. Thank you!";
    const result = parseGojekReceipt(body, internalDate);
    expect(result.status).toBe("failed");
  });

  it("extracts Indonesian pickup/dropoff patterns", () => {
    const body = "Gojek trip receipt\nTotal: S$10.00\nPenjemputan: Jalan Sudirman\nTujuan: Grand Indonesia";
    const result = parseGojekReceipt(body, internalDate);

    expect(result.status).toBe("parsed");
    if (result.status !== "parsed") return;
    expect(result.data.pickup).toBe("Jalan Sudirman");
    expect(result.data.dropoff).toBe("Grand Indonesia");
  });
});
