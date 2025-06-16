// audit_sales_categories.ts
// Usage: npx ts-node audit_sales_categories.ts
// Requires: npm install node-fetch@2 @types/node-fetch --save-dev

// @ts-ignore
import fetch from 'node-fetch';

const API_URL = 'http://localhost:8000/api/sales/all';

// The expected categories and their canonical forms
const CATEGORY_MAP: Record<string, string> = {
  'ACCESS': 'Access',
  'AMENITIES PLUS': 'Amenities Plus',
  'AMENITIES': 'Amenities Plus',
  'CHAMPIONS CLUB': 'Champions Training',
};

function getCategory(membership_type: string | undefined): string | null {
  if (!membership_type) return null;
  const mt = membership_type.trim().toUpperCase();
  if (CATEGORY_MAP[mt]) return CATEGORY_MAP[mt];
  return null;
}

interface Sale {
  sale_id: number;
  member_name: string;
  commission_employees: string;
  membership_type?: string;
}

async function audit() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    console.error('Failed to fetch sales data:', res.statusText);
    process.exit(1);
  }
  const sales: Sale[] = await res.json();

  // Only unassigned deals
  const unassigned = sales.filter((s) => !s.commission_employees || s.commission_employees.trim() === '');

  // Count by membership_type
  const byType: Record<string, number> = {};
  for (const s of unassigned) {
    const mt = (s.membership_type || '').trim();
    byType[mt] = (byType[mt] || 0) + 1;
  }

  // Print summary
  console.log('Unassigned deals by membership_type:');
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const cat = getCategory(type);
      if (cat) {
        console.log(`  [OK]   ${type.padEnd(20)} → ${cat.padEnd(18)} : ${count}`);
      } else {
        console.log(`  [WARN] ${type.padEnd(20)} → (NO CATEGORY)     : ${count}`);
      }
    });

  // List all unassigned deals with unknown membership_type
  const unknowns = unassigned.filter((s) => !getCategory((s.membership_type || '').trim()));
  if (unknowns.length > 0) {
    console.log('\nDeals with unknown membership_type:');
    unknowns.forEach(s => {
      console.log(`  sale_id=${s.sale_id}, member_name="${s.member_name}", membership_type="${s.membership_type}"`);
    });
  } else {
    console.log('\nAll unassigned deals have recognized membership_type.');
  }
}

audit().catch(e => { console.error(e); process.exit(1); }); 