import { saveEntity, getEntities } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initialPlatforms = [
  { id: "pl_dss", name: "DSS", description: "Dahua Security System platform", color: "#6366f1", is_default: true, status: "Active" },
  { id: "pl_lytehouse", name: "Lytehouse", description: "Lytehouse cloud VMS platform", color: "#10b981", is_default: false, status: "Active" },
  { id: "pl_p2p", name: "P2P Direct", description: "Direct P2P / Serial Connection", color: "#f59e0b", is_default: false, status: "Active" },
  { id: "pl_hik", name: "HikCentral", description: "Hikvision HikCentral Enterprise", color: "#ef4444", is_default: false, status: "Active" },
  { id: "pl_nx", name: "Nx Witness", description: "Network Optix VMS", color: "#8b5cf6", is_default: false, status: "Active" }
];

const initialSites = [
  {
    id: "st_001",
    site_name: "Sandton City Mall North",
    site_code: "SCM-N01",
    platform_id: "pl_dss",
    site_status: "Active",
    monitoring_schedule: "24/7",
    client_company: "Liberty Two Degrees",
    primary_contact: "John Doe",
    contact_telephone: "+27 11 883 2000",
    contact_email: "jdoe@sandtoncity.co.za",
    physical_address: "83 Rivonia Rd, Sandhurst, Sandton, 2196",
    province: "Gauteng",
    region: "Johannesburg North",
    channel_count: 48,
    is_favorite: true,
    last_service_date: "2026-05-15",
    next_service_due: "2026-08-15",
    maintenance_interval_months: 3,
    tags: ["Retail", "High Priority", "Perimeter"]
  },
  {
    id: "st_002",
    site_name: "V&A Waterfront Silo District",
    site_code: "VAW-SD02",
    platform_id: "pl_lytehouse",
    site_status: "Active",
    monitoring_schedule: "24/7",
    client_company: "V&A Waterfront Holdings",
    primary_contact: "Sarah Jenkins",
    contact_telephone: "+27 21 408 7500",
    contact_email: "sjenkins@waterfront.co.za",
    physical_address: "Silo District, V&A Waterfront, Cape Town, 8001",
    province: "Western Cape",
    region: "Cape Town Central",
    channel_count: 64,
    is_favorite: true,
    last_service_date: "2026-07-01",
    next_service_due: "2026-10-01",
    maintenance_interval_months: 3,
    tags: ["Commercial", "Harbour", "PTZ"]
  },
  {
    id: "st_003",
    site_name: "Durban Container Terminal Gate 4",
    site_code: "DCT-G04",
    platform_id: "pl_p2p",
    site_status: "Offline",
    monitoring_schedule: "24/7",
    client_company: "Transnet Port Terminals",
    primary_contact: "Sipho Mabena",
    contact_telephone: "+27 31 361 8000",
    contact_email: "smabena@transnet.net",
    physical_address: "Pier 2, Langeberg Rd, Bayhead, Durban, 4052",
    province: "KwaZulu-Natal",
    region: "Durban Central",
    channel_count: 16,
    is_favorite: false,
    last_service_date: "2026-02-10",
    next_service_due: "2026-05-10",
    maintenance_interval_months: 3,
    tags: ["Industrial", "ANPR", "Port"]
  }
];

export async function seedDatabase() {
  const existingPlatforms = await getEntities('Platform');
  if (existingPlatforms.length === 0) {
    console.log('Seeding initial platforms...');
    for (const p of initialPlatforms) {
      await saveEntity('Platform', p);
    }
  }

  const existingSites = await getEntities('Site');
  if (existingSites.length === 0) {
    console.log('Seeding initial sites...');
    for (const s of initialSites) {
      await saveEntity('Site', s);
    }
  }

  console.log('Database seeding complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
