# Quotation Edit Page Testing Findings (2026-02-17)

## Test Scenario: Add 3 Products to Quotation

### Products Added:
1. ✅ **Modern Upholstered Dining Chair - Gray (DC-001-GRY)**
   - Batch: Selected (40 units @ $115.00)
   - Subtotal: $4,600.00

2. ✅ **Windsor-Style Dining Chair - Oak (DC-005-OAK)**
   - Batch: Selected (1 unit @ $562.50)
   - Subtotal: $562.50

3. ⚠️ **Solid Oak Rectangular Dining Table (DT-001-OAK)**
   - Batch dropdown opened but no batch options visible
   - Unit price shows $0
   - Issue: Batch dropdown appears empty (only search box visible)

### Current Total Amount: USD $5,162.50
- Product 1: $4,600.00
- Product 2: $562.50
- Product 3: $0 (no batch selected)

### Issues Found:
1. **Batch dropdown empty for third product** - The batch dropdown for "Solid Oak Rectangular Dining Table" shows only a search box with no batch options listed. This could be:
   - No batches exist for this product in the database
   - Batch loading issue
   - UI rendering issue

### Next Steps:
- Check if batches exist for product DT-001-OAK in database
- If no batches exist, create sample batches
- If batches exist, investigate why they're not loading in the dropdown
