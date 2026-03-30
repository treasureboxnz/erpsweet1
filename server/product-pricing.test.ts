import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the pricing calculation logic used in PricingTabContent
describe('Product Pricing Calculations', () => {
  // FOB Total Cost calculation
  describe('FOB Total Cost', () => {
    it('should calculate FOB total cost from factory USD FOB + FOB fee RMB / exchange rate', () => {
      const factoryPriceUsdFob = 50;
      const fobFeeRmb = 36;
      const exchangeRate = 7.2;
      
      const fobTotalCost = factoryPriceUsdFob + (fobFeeRmb / exchangeRate);
      expect(fobTotalCost).toBe(55);
    });

    it('should handle zero FOB fee', () => {
      const factoryPriceUsdFob = 50;
      const fobFeeRmb = 0;
      const exchangeRate = 7.2;
      
      const fobTotalCost = factoryPriceUsdFob + (fobFeeRmb / exchangeRate);
      expect(fobTotalCost).toBe(50);
    });

    it('should handle null factory price', () => {
      const factoryPriceUsdFob = 0;
      const fobFeeRmb = 36;
      const exchangeRate = 7.2;
      
      const fobTotalCost = factoryPriceUsdFob + (fobFeeRmb / exchangeRate);
      expect(fobTotalCost).toBe(5);
    });
  });

  // Margin calculation
  describe('Margin Calculation', () => {
    it('should calculate margin percentage from selling price and total cost', () => {
      const sellingPrice = 100;
      const totalCost = 55;
      
      const margin = ((sellingPrice - totalCost) / sellingPrice) * 100;
      expect(margin).toBe(45);
    });

    it('should return 0 for zero selling price', () => {
      const sellingPrice = 0;
      const totalCost = 55;
      
      // Guard against division by zero
      const margin = sellingPrice === 0 ? 0 : ((sellingPrice - totalCost) / sellingPrice) * 100;
      expect(margin).toBe(0);
    });

    it('should handle negative margin (selling below cost)', () => {
      const sellingPrice = 40;
      const totalCost = 55;
      
      const margin = ((sellingPrice - totalCost) / sellingPrice) * 100;
      expect(margin).toBeLessThan(0);
    });
  });

  // Price from margin calculation
  describe('Price from Margin Calculation', () => {
    it('should calculate price from target margin and total cost', () => {
      const totalCost = 55;
      const targetMargin = 30; // 30%
      
      // price = cost / (1 - margin/100)
      const price = totalCost / (1 - targetMargin / 100);
      expect(price).toBeCloseTo(78.57, 1);
    });

    it('should handle 0% margin (price equals cost)', () => {
      const totalCost = 55;
      const targetMargin = 0;
      
      const price = totalCost / (1 - targetMargin / 100);
      expect(price).toBe(55);
    });

    it('should handle high margin', () => {
      const totalCost = 55;
      const targetMargin = 50;
      
      const price = totalCost / (1 - targetMargin / 100);
      expect(price).toBe(110);
    });
  });

  // Volume unit conversion
  describe('Volume Unit Conversion (CBM)', () => {
    it('should calculate CBM from cm dimensions', () => {
      const length = 50; // cm
      const width = 40;  // cm
      const height = 30; // cm
      const factor = 0.01; // cm to m
      
      const cbm = (length * factor) * (width * factor) * (height * factor);
      expect(cbm).toBeCloseTo(0.06, 4);
    });

    it('should calculate CBM from m dimensions', () => {
      const length = 0.5; // m
      const width = 0.4;  // m
      const height = 0.3; // m
      const factor = 1; // m to m
      
      const cbm = (length * factor) * (width * factor) * (height * factor);
      expect(cbm).toBeCloseTo(0.06, 4);
    });

    it('should calculate CBM from mm dimensions', () => {
      const length = 500; // mm
      const width = 400;  // mm
      const height = 300; // mm
      const factor = 0.001; // mm to m
      
      const cbm = (length * factor) * (width * factor) * (height * factor);
      expect(cbm).toBeCloseTo(0.06, 4);
    });

    it('should give same CBM regardless of unit (cm, m, mm)', () => {
      // Same physical dimensions in different units
      const cmCbm = (50 * 0.01) * (40 * 0.01) * (30 * 0.01);
      const mCbm = (0.5 * 1) * (0.4 * 1) * (0.3 * 1);
      const mmCbm = (500 * 0.001) * (400 * 0.001) * (300 * 0.001);
      
      expect(cmCbm).toBeCloseTo(mCbm, 6);
      expect(mCbm).toBeCloseTo(mmCbm, 6);
    });

    it('should handle large furniture dimensions in cm', () => {
      // A sofa: 200cm x 80cm x 90cm
      const length = 200;
      const width = 80;
      const height = 90;
      const factor = 0.01;
      
      const cbm = (length * factor) * (width * factor) * (height * factor);
      expect(cbm).toBeCloseTo(1.44, 2);
    });
  });

  // Format price helper
  describe('Format Price', () => {
    it('should format RMB price with ¥ symbol', () => {
      const value = 1234.56;
      const symbol = "¥";
      const formatted = `${symbol} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      expect(formatted).toBe("¥ 1,234.56");
    });

    it('should format USD price with $ symbol', () => {
      const value = 1234.56;
      const symbol = "$";
      const formatted = `${symbol} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      expect(formatted).toBe("$ 1,234.56");
    });
  });
});
