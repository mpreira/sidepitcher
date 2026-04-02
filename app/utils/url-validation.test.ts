import { describe, it, expect } from "vitest";
import { validateIcsUrl } from "~/utils/url-validation";

describe("validateIcsUrl()", () => {
  // --- Valid URLs ---
  it("accepts https:// URLs", () => {
    expect(validateIcsUrl("https://calendar.google.com/calendar.ics")).toEqual({ ok: true });
  });

  it("accepts webcal:// URLs", () => {
    expect(validateIcsUrl("webcal://calendar.example.com/cal.ics")).toEqual({ ok: true });
  });

  // --- Blocked protocols ---
  it("rejects http:// URLs", () => {
    const result = validateIcsUrl("http://example.com/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("rejects file:// URLs", () => {
    const result = validateIcsUrl("file:///etc/passwd");
    expect(result.ok).toBe(false);
  });

  it("rejects ftp:// URLs", () => {
    const result = validateIcsUrl("ftp://evil.com/data");
    expect(result.ok).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    const result = validateIcsUrl("javascript:alert(1)");
    expect(result.ok).toBe(false);
  });

  // --- SSRF: private and internal IPs ---
  it("blocks localhost", () => {
    const result = validateIcsUrl("https://localhost/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks 127.0.0.1", () => {
    const result = validateIcsUrl("https://127.0.0.1/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks [::1]", () => {
    const result = validateIcsUrl("https://[::1]/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks 10.x.x.x", () => {
    const result = validateIcsUrl("https://10.0.0.1/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks 192.168.x.x", () => {
    const result = validateIcsUrl("https://192.168.1.1/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks 172.16-31.x.x", () => {
    expect(validateIcsUrl("https://172.16.0.1/cal.ics").ok).toBe(false);
    expect(validateIcsUrl("https://172.20.5.1/cal.ics").ok).toBe(false);
    expect(validateIcsUrl("https://172.31.255.255/cal.ics").ok).toBe(false);
  });

  it("allows 172.32.x.x (not private)", () => {
    expect(validateIcsUrl("https://172.32.0.1/cal.ics").ok).toBe(true);
  });

  it("blocks .local domains", () => {
    const result = validateIcsUrl("https://myserver.local/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks 0.0.0.0", () => {
    const result = validateIcsUrl("https://0.0.0.0/cal.ics");
    expect(result.ok).toBe(false);
  });

  it("blocks AWS metadata endpoint", () => {
    const result = validateIcsUrl("https://169.254.169.254/latest/meta-data/");
    expect(result.ok).toBe(false);
  });

  // --- Invalid URLs ---
  it("rejects garbage strings", () => {
    const result = validateIcsUrl("not-a-url");
    expect(result.ok).toBe(false);
  });

  it("rejects empty string", () => {
    const result = validateIcsUrl("");
    expect(result.ok).toBe(false);
  });
});
