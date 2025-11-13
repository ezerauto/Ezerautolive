import Papa from 'papaparse';
import { db } from '../db';
import { vehicles } from '@db/schema';

type VehicleImportData = {
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  stockNumber?: string;
  location?: string;
  purchasePrice?: number;
  targetSalePrice?: number;
  minimumPrice?: number;
  odometer?: number;
  color?: string;
  titleStatus?: string;
  purchaseFrom?: string;
  status?: string;
};

export async function parseInventoryCSV(csvContent: string): Promise<VehicleImportData[]> {
  const lines = csvContent.split('\n');
  const vehicles: VehicleImportData[] = [];
  
  // Skip header rows (first 7 lines)
  let i = 7;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line || line.split(',').every(cell => !cell.trim())) {
      i++;
      continue;
    }
    
    // Parse vehicle info (spans 5 rows)
    const row1 = lines[i]?.split(',') || [];
    const row2 = lines[i + 1]?.split(',') || [];
    const row3 = lines[i + 2]?.split(',') || [];
    const row4 = lines[i + 3]?.split(',') || [];
    const row5 = lines[i + 4]?.split(',') || [];
    
    // Extract vehicle name from row1[0]
    const vehicleName = row1[0]?.trim() || '';
    const nameParts = vehicleName.match(/(\d{4})\s+([A-Z\-]+)\s+(.+)/);
    
    if (nameParts) {
      const year = parseInt(nameParts[1]);
      const make = nameParts[2];
      const model = nameParts[3];
      
      // Extract location from row1[11]
      const location = row1[11]?.trim();
      
      // Extract pricing from row1[13] and row1[15]
      const retailPrice = parsePrice(row1[13]);
      const totalCost = parsePrice(row1[15]);
      
      // Extract VIN from row2[1]
      const vin = row2[1]?.trim();
      
      // Extract stock number from row2[5]
      const stockNumber = row2[5]?.trim();
      
      // Extract odometer from row2[9]
      const odometer = parseInt(row2[9]?.replace(/,/g, '') || '0');
      
      // Extract color from row1[9]
      const color = row1[9]?.trim();
      
      // Extract asking price from row3[13]
      const askingPrice = parsePrice(row3[13]);
      
      // Extract vehicle cost from row3[15]
      const vehicleCost = parsePrice(row3[15]);
      
      // Extract purchase from from row4[1]
      const purchaseFrom = row4[1]?.trim();
      
      // Extract title status from row5[1]
      const titleStatus = row5[1]?.trim();
      
      // Determine status based on location and title
      let status: string | undefined;
      if (location === 'ROATAN') {
        status = 'in_stock';
      } else if (location === 'OMAHA') {
        status = 'in_stock';
      }
      
      vehicles.push({
        year,
        make,
        model,
        vin: vin || undefined,
        stockNumber: stockNumber || undefined,
        location: location || undefined,
        purchasePrice: vehicleCost || totalCost,
        targetSalePrice: retailPrice,
        minimumPrice: askingPrice,
        odometer,
        color: color || undefined,
        titleStatus: titleStatus === 'RECEIVED' ? 'clean' : titleStatus === 'NOT RECEIVED' ? undefined : titleStatus?.toLowerCase(),
        purchaseFrom: purchaseFrom || undefined,
        status: status as any,
      });
    }
    
    // Move to next vehicle (skip 6 rows - 5 data rows + 1 blank)
    i += 6;
  }
  
  return vehicles;
}

function parsePrice(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export async function importVehiclesFromCSV(csvContent: string) {
  const vehicleData = await parseInventoryCSV(csvContent);
  const imported = [];
  const errors = [];
  
  for (const data of vehicleData) {
    try {
      // Only import if we have minimum required data
      if (data.year && data.make && data.model) {
        const [vehicle] = await db.insert(vehicles).values({
          year: data.year,
          make: data.make,
          model: data.model,
          vin: data.vin,
          stockNumber: data.stockNumber,
          purchasePrice: data.purchasePrice,
          targetSalePrice: data.targetSalePrice,
          minimumPrice: data.minimumPrice,
          odometer: data.odometer,
          color: data.color,
          titleStatus: data.titleStatus,
          purchaseFrom: data.purchaseFrom,
          status: data.status || 'in_stock',
        }).returning();
        
        imported.push(vehicle);
      }
    } catch (error) {
      errors.push({ data, error: (error as Error).message });
    }
  }
  
  return { imported, errors };
}
