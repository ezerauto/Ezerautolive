import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();
const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!bucketId) {
  console.error('DEFAULT_OBJECT_STORAGE_BUCKET_ID not set');
  process.exit(1);
}

const bucket = storage.bucket(bucketId);

const contractFiles = [
  {
    localPath: 'attached_assets/MIPA_Master_Consignment_Agreement copy_1762997762430.docx',
    remotePath: 'public/contracts/MIPA_Master_Consignment_Agreement.docx',
    contractId: 'test-contract-001',
    type: 'partnership_agreement'
  },
  {
    localPath: 'attached_assets/Per_Vehicle_Sale_Closure_Liquidation_Agreement copy_1762997762430.docx',
    remotePath: 'public/contracts/Per_Vehicle_Sale_Closure.docx',
    contractId: 'test-sale-001',
    type: 'sale_closure'
  },
  {
    localPath: 'attached_assets/Personal_Vehicle_Custody_Agreement copy_1762997762430.docx',
    remotePath: 'public/contracts/Personal_Vehicle_Custody_Agreement.docx',
    contractId: 'test-custody-001',
    type: 'custody'
  },
  {
    localPath: 'attached_assets/Vehicle_Receipt_Inspection_Certificate copy_1762997762430.docx',
    remotePath: 'public/contracts/Vehicle_Receipt_Inspection_Certificate.docx',
    contractId: 'test-inspection-001',
    type: 'arrival_inspection'
  }
];

async function uploadContracts() {
  console.log('Starting contract upload...');
  
  for (const file of contractFiles) {
    try {
      console.log(`\nUploading ${file.localPath}...`);
      
      await bucket.upload(file.localPath, {
        destination: file.remotePath,
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        public: true,
      });
      
      const publicUrl = `https://storage.googleapis.com/${bucketId}/${file.remotePath}`;
      console.log(`✓ Uploaded successfully`);
      console.log(`  Public URL: ${publicUrl}`);
      console.log(`  Contract ID: ${file.contractId}`);
      console.log(`  Type: ${file.type}`);
      
    } catch (error) {
      console.error(`✗ Failed to upload ${file.localPath}:`, error);
    }
  }
  
  console.log('\nUpload complete!');
}

uploadContracts().catch(console.error);
