import { db } from '../db';
import { vehicles } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Parse price string to number
function parsePrice(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) || num === 0 ? undefined : num;
}

// Parse the CSV data
async function importInventoryCSV() {
  const csvPath = path.join(process.cwd(), 'attached_assets', 'Active Inventory Detail  Scheduler Report_1763009154069.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  const vehicleData = [];
  let i = 8; // Skip header rows (row 8 is first vehicle in 0-indexed)
  
  while (i < lines.length) {
    const line = lines[i]?.trim();
    
    // Skip empty lines
    if (!line || line.split(',').every(cell => !cell.trim())) {
      i++;
      continue;
    }
    
    const row1 = lines[i]?.split(',') || [];
    const row2 = lines[i + 1]?.split(',') || [];
    const row3 = lines[i + 2]?.split(',') || [];
    const row4 = lines[i + 3]?.split(',') || [];
    const row5 = lines[i + 4]?.split(',') || [];
    
    // Extract vehicle name and parse year/make/model
    const vehicleName = row1[0]?.trim();
    const nameParts = vehicleName?.match(/(\d{4})\s+([A-Z\-]+)\s+(.+)/);
    
    if (nameParts && vehicleName) {
      const year = parseInt(nameParts[1]);
      const make = nameParts[2];
      const model = nameParts[3];
      
      // Extract other fields
      const color = row1[9]?.trim() || undefined;
      const location = row1[11]?.trim();
      const retailPrice = parsePrice(row1[13]);
      const totalCost = parsePrice(row1[15]);
      
      const vin = row2[1]?.trim();
      const stockNumber = row2[7]?.trim() || undefined;
      const odometer = parseInt(row2[9]?.replace(/,/g, '') || '0') || undefined;
      
      const askingPrice = parsePrice(row3[13]);
      const vehicleCost = parsePrice(row3[15]);
      
      const purchaseFrom = row4[1]?.trim() || undefined;
      
      const titleStatusRaw = row5[1]?.trim();
      let titleStatus: string | undefined;
      if (titleStatusRaw === 'RECEIVED') {
        titleStatus = 'clean';
      } else if (titleStatusRaw === 'NOT RECEIVED') {
        titleStatus = undefined;
      } else {
        titleStatus = titleStatusRaw?.toLowerCase();
      }
      
      // Extract Date In Stock from row1[7] - format like "10/25/2025 (9 Days)"
      const dateInStockRaw = row1[7]?.trim();
      let purchaseDate = new Date(); // Default to today
      if (dateInStockRaw) {
        const dateMatch = dateInStockRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          const [_, month, day, year] = dateMatch;
          purchaseDate = new Date(`${year}-${month}-${day}`);
        }
      }
      
      // Skip if missing required VIN
      if (!vin) {
        console.log(`⚠️  Skipping ${year} ${make} ${model} - missing VIN`);
        i += 6;
        continue;
      }
      
      // Require purchase price
      const finalPurchasePrice = vehicleCost || totalCost;
      if (!finalPurchasePrice) {
        console.log(`⚠️  Skipping ${year} ${make} ${model} (VIN: ${vin}) - missing purchase price`);
        i += 6;
        continue;
      }
      
      vehicleData.push({
        year,
        make,
        model,
        vin,
        stockNumber,
        purchasePrice: finalPurchasePrice,
        purchaseDate,
        targetSalePrice: retailPrice,
        minimumPrice: askingPrice,
        odometer,
        color,
        titleStatus,
        purchaseFrom,
        status: 'in_stock' as const,
      });
    }
    
    // Move to next vehicle (each vehicle is 5 data rows + 1 blank row)
    i += 6;
  }
  
  console.log(`\nParsed ${vehicleData.length} vehicles from CSV\n`);
  
  // Import vehicles
  let imported = 0;
  let skipped = 0;
  
  for (const data of vehicleData) {
    try {
      // Check if VIN already exists
      if (data.vin) {
        const existing = await db.query.vehicles.findFirst({
          where: (vehicles, { eq }) => eq(vehicles.vin, data.vin!),
        });
        
        if (existing) {
          console.log(`⏭️  Skipped: ${data.year} ${data.make} ${data.model} (VIN ${data.vin} already exists)`);
          skipped++;
          continue;
        }
      }
      
      await db.insert(vehicles).values(data);
      console.log(`✅ Imported: ${data.year} ${data.make} ${data.model}`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing ${data.year} ${data.make} ${data.model}:`, error);
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Imported: ${imported} vehicles`);
  console.log(`   ⏭️  Skipped: ${skipped} vehicles (already exist)`);
  console.log(`   📦 Total: ${vehicleData.length} vehicles in CSV`);
}

// Run the import
importInventoryCSV()
  .then(() => {
    console.log('\n✨ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
