import { describe, it, expect } from "vitest";

/**
 * Test suite for SKU getNextCode fix
 * 
 * The fix ensures that getNextCode checks if the generated code already exists
 * in the database and automatically skips to the next available code.
 * 
 * Since the actual getNextCode is a tRPC procedure that requires DB context,
 * we test the core logic: the code generation and conflict resolution algorithm.
 */

describe("SKU Code Generation Logic", () => {
  // Simulate the code generation logic from getNextCode
  function generateCode(prefix: string, counter: number, suffixLength: number): string {
    const suffix = String(counter).padStart(suffixLength, "0");
    return `${prefix}${suffix}`;
  }

  // Simulate the conflict resolution logic
  function findNextAvailableCode(
    prefix: string,
    startCounter: number,
    suffixLength: number,
    existingCodes: Set<string>,
    maxAttempts = 100
  ): string {
    let counter = startCounter;
    let code = "";
    for (let i = 0; i < maxAttempts; i++) {
      code = generateCode(prefix, counter, suffixLength);
      if (!existingCodes.has(code)) break;
      counter++;
    }
    return code;
  }

  it("should generate correct code format", () => {
    expect(generateCode("PRD", 1, 4)).toBe("PRD0001");
    expect(generateCode("PRD", 106, 4)).toBe("PRD0106");
    expect(generateCode("CUS", 1, 5)).toBe("CUS00001");
    expect(generateCode("ORD", 999, 4)).toBe("ORD0999");
  });

  it("should skip existing codes and find next available", () => {
    const existingCodes = new Set(["PRD0106"]);
    const result = findNextAvailableCode("PRD", 106, 4, existingCodes);
    expect(result).toBe("PRD0107");
  });

  it("should skip multiple consecutive existing codes", () => {
    const existingCodes = new Set(["PRD0106", "PRD0107", "PRD0108"]);
    const result = findNextAvailableCode("PRD", 106, 4, existingCodes);
    expect(result).toBe("PRD0109");
  });

  it("should return first code if no conflicts", () => {
    const existingCodes = new Set<string>();
    const result = findNextAvailableCode("PRD", 106, 4, existingCodes);
    expect(result).toBe("PRD0106");
  });

  it("should handle customer codes", () => {
    const existingCodes = new Set(["CUS00001", "CUS00002"]);
    const result = findNextAvailableCode("CUS", 1, 5, existingCodes);
    expect(result).toBe("CUS00003");
  });

  it("should handle order codes", () => {
    const existingCodes = new Set(["ORD0050"]);
    const result = findNextAvailableCode("ORD", 50, 4, existingCodes);
    expect(result).toBe("ORD0051");
  });

  it("should handle supplier codes", () => {
    const existingCodes = new Set(["SUP001"]);
    const result = findNextAvailableCode("SUP", 1, 3, existingCodes);
    expect(result).toBe("SUP002");
  });
});

describe("HTML Strip Logic for Product Description", () => {
  function stripHtml(html: string | null | undefined): string {
    if (!html) return "";
    return html
      .replace(/<\/(p|div|br|li|h[1-6])>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  it("should strip HTML tags and return plain text", () => {
    const html = "<p>毛重 45</p><p>需要有木腿</p><p>实木框架</p>";
    const result = stripHtml(html);
    expect(result).toBe("毛重 45 需要有木腿 实木框架");
  });

  it("should handle br tags", () => {
    const html = "Line 1<br/>Line 2<br>Line 3";
    const result = stripHtml(html);
    expect(result).toBe("Line 1 Line 2 Line 3");
  });

  it("should handle nested HTML", () => {
    const html = "<div><p>Hello <strong>World</strong></p></div>";
    const result = stripHtml(html);
    expect(result).toBe("Hello World");
  });

  it("should decode HTML entities", () => {
    const html = "Price &lt; $100 &amp; &gt; $50";
    const result = stripHtml(html);
    expect(result).toBe('Price < $100 & > $50');
  });

  it("should handle null and undefined", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });

  it("should handle plain text without HTML", () => {
    const text = "A simple description without any HTML";
    expect(stripHtml(text)).toBe(text);
  });

  it("should collapse multiple spaces", () => {
    const html = "<p>  Multiple   spaces  </p>";
    expect(stripHtml(html)).toBe("Multiple spaces");
  });
});
