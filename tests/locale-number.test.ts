import { describe, expect, it } from "vitest";
import {
  formatCurrencyIdr,
  formatNumberLocale,
  isMicroPercentNutrient,
  parseLocaleDecimal,
  resolveDisplayDigits,
} from "../src/utils/locale-number";

describe("locale-number utilities", () => {
  it("parses Indonesian comma and dot decimal strings accurately", () => {
    expect(parseLocaleDecimal("21,5")).toBe(21.5);
    expect(parseLocaleDecimal("21.5")).toBe(21.5);
    expect(parseLocaleDecimal("0,05")).toBe(0.05);
    expect(parseLocaleDecimal("1.125")).toBe(1.125);
    expect(parseLocaleDecimal("  1250  ")).toBe(1250);
  });

  it("parses thousand separators safely when paired with comma or enabled for currency", () => {
    expect(parseLocaleDecimal("5.500,25")).toBe(5500.25);
    expect(parseLocaleDecimal("1.000.000")).toBe(1000000);
    expect(parseLocaleDecimal("5.500", { treatSingleThousandDot: true })).toBe(5500);
  });

  it("returns null for empty, NaN, or non-numeric strings", () => {
    expect(parseLocaleDecimal("")).toBeNull();
    expect(parseLocaleDecimal("   ")).toBeNull();
    expect(parseLocaleDecimal("-")).toBeNull();
    expect(parseLocaleDecimal("abc")).toBeNull();
    expect(parseLocaleDecimal("12,34,56")).toBeNull();
  });

  it("formats numbers and IDR currency using id-ID locale without crashing", () => {
    expect(formatNumberLocale(67.6123, 2)).toBe("67,61");
    expect(formatNumberLocale(3350, 0)).toBe("3.350");
    expect(formatCurrencyIdr(6374.12)).toMatch(/Rp\s?6\.374/);
  });

  it("applies Smart Micro Floor via resolveDisplayDigits (0 default, >=2 decimals for micro < 2%)", () => {
    // Macro nutrients honor 0 / 1 / 2 preference directly
    expect(resolveDisplayDigits("%", "cp", 0, 21.5)).toBe(0);
    expect(resolveDisplayDigits("%", "cp", 1, 21.5)).toBe(1);
    expect(resolveDisplayDigits("%", "cp", 2, 21.5)).toBe(2);
    expect(resolveDisplayDigits("%", "inclusion", 0, 12.34)).toBe(0);

    // Micro percentage nutrients preserve >= 2 decimals when 0 < |val| < 2
    expect(isMicroPercentNutrient("ca")).toBe(true);
    expect(isMicroPercentNutrient("p")).toBe(true);
    expect(isMicroPercentNutrient("lys")).toBe(true);
    expect(resolveDisplayDigits("%", "ca", 0, 0.95)).toBe(2);
    expect(resolveDisplayDigits("%", "p", 0, 0.45)).toBe(2);
    expect(resolveDisplayDigits("%", "lys", 1, 1.15)).toBe(2);
    expect(resolveDisplayDigits("%", "ca", 0, 0)).toBe(0);
    //When Layer Ca >= 2%, follows global macro preference
    expect(resolveDisplayDigits("%", "ca", 0, 3.6)).toBe(0);

    // Min/Max bounds & sub-1% values preserve up to 3 significant decimal places (0.00x)
    expect(resolveDisplayDigits("%", "min", 0, 0.5)).toBe(1);
    expect(resolveDisplayDigits("%", "max", 0, 0.05)).toBe(2);
    expect(resolveDisplayDigits("%", "min", 0, 0.005)).toBe(3);
    expect(resolveDisplayDigits("%", "inclusion", 0, 0.5)).toBe(2);
    expect(resolveDisplayDigits("%", "inclusion", 0, 0.004)).toBe(3);

    // Non-% units (kcal/kg, mg/kg, mEq/kg, IU/kg) stay integer (0 decimals)
    expect(resolveDisplayDigits("kcal/kg", "me_poultry", 2, 3050)).toBe(0);
    expect(resolveDisplayDigits("mg/kg", "zn", 2, 65)).toBe(0);
    expect(resolveDisplayDigits("mEq/kg", "deb", 2, 240)).toBe(0);
  });
});
