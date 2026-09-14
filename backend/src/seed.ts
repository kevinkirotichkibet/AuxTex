/**
 * Seeds the database with a starter catalog: materials (including African
 * prints) and products that reference them.
 *
 * This runs as a plain script against Mongoose directly rather than through
 * Nest's DI container, so it works the same way whether you run it locally
 * (after `npm run build`) or inside the Docker container, where only
 * production dependencies are installed.
 *
 * Usage:
 *   npm run build && npm run seed        (local)
 *   docker compose exec backend npm run seed   (Docker)
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Material, MaterialSchema } from './materials/material.schema';
import { Product, ProductSchema } from './products/product.schema';
import { User, UserSchema } from './users/user.schema';

const ADMIN_EMAIL = 'admin@auxtexfit.com';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auxtexfit';
  await mongoose.connect(uri);

  const MaterialModel = mongoose.model(Material.name, MaterialSchema);
  const ProductModel = mongoose.model(Product.name, ProductSchema);
  const UserModel = mongoose.model(User.name, UserSchema);

  await MaterialModel.deleteMany({});
  await ProductModel.deleteMany({});

  const materials = await MaterialModel.insertMany([
    { name: 'Italian Wool - Navy', type: 'wool', color: '#1a2744', pricePerMeter: 4500 },
    { name: 'Charcoal Wool Flannel', type: 'wool', color: '#36454f', pricePerMeter: 4200 },
    { name: 'Egyptian Cotton - White', type: 'cotton', color: '#f5f5f0', pricePerMeter: 1800 },
    { name: 'Oxford Cotton - Sky Blue', type: 'cotton', color: '#a9c6e8', pricePerMeter: 1600 },
    { name: 'Irish Linen - Sand', type: 'linen', color: '#e0d3b8', pricePerMeter: 2200 },
    { name: 'Mulberry Silk - Burgundy', type: 'silk', color: '#6d1f2c', pricePerMeter: 5200 },
    { name: 'Maasai Shuka - Red Check', type: 'african-print', color: '#b1272c', pricePerMeter: 2800 },
    { name: 'Kitenge - Sunburst Ankara', type: 'african-print', color: '#e8a33d', pricePerMeter: 2600 },
    { name: 'Kente-Inspired Weave - Gold/Green', type: 'african-print', color: '#c9a227', pricePerMeter: 3200 },
    { name: 'Kikoy Stripe - Coastal Blue', type: 'african-print', color: '#2f6690', pricePerMeter: 2000 },
  ]);

  const byName = Object.fromEntries(materials.map((m) => [m.name, m._id]));

  await ProductModel.insertMany([
    {
      name: 'Bespoke Suit',
      category: 'suit',
      basePrice: 15000,
      description: 'A classic two-piece suit, tailored to your measurements.',
      compatibleMaterials: [
        byName['Italian Wool - Navy'],
        byName['Charcoal Wool Flannel'],
        byName['Mulberry Silk - Burgundy'],
      ],
    },
    {
      name: 'Tailored Blazer',
      category: 'blazer',
      basePrice: 9500,
      description: 'A structured single-breasted blazer that pairs with anything.',
      compatibleMaterials: [
        byName['Italian Wool - Navy'],
        byName['Charcoal Wool Flannel'],
        byName['Irish Linen - Sand'],
      ],
    },
    {
      name: 'Dress Shirt',
      category: 'shirt',
      basePrice: 4500,
      description: 'A crisp, made-to-measure shirt for work or formal occasions.',
      compatibleMaterials: [
        byName['Egyptian Cotton - White'],
        byName['Oxford Cotton - Sky Blue'],
        byName['Irish Linen - Sand'],
      ],
    },
    {
      name: 'Tailored Trousers',
      category: 'trousers',
      basePrice: 5500,
      description: 'Flat-front trousers cut precisely to your measurements.',
      compatibleMaterials: [
        byName['Italian Wool - Navy'],
        byName['Charcoal Wool Flannel'],
        byName['Oxford Cotton - Sky Blue'],
      ],
    },
    {
      name: 'Ankara Wrap Dress',
      category: 'dress',
      basePrice: 7000,
      description: 'A flattering wrap dress made from bold African print fabric.',
      compatibleMaterials: [
        byName['Kitenge - Sunburst Ankara'],
        byName['Maasai Shuka - Red Check'],
        byName['Kente-Inspired Weave - Gold/Green'],
      ],
    },
    {
      name: 'Kitenge Pencil Skirt',
      category: 'skirt',
      basePrice: 4000,
      description: 'A fitted pencil skirt in vibrant Kitenge print.',
      compatibleMaterials: [
        byName['Kitenge - Sunburst Ankara'],
        byName['Kente-Inspired Weave - Gold/Green'],
        byName['Kikoy Stripe - Coastal Blue'],
      ],
    },
  ]);

  console.log(`Seeded ${materials.length} materials and 6 products.`);

  // Create (or reset) a single admin account for managing the catalog.
  // Products/materials creation is locked to this role — see
  // backend/src/common/guards/roles.guard.ts
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await UserModel.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { name: 'Admin', email: ADMIN_EMAIL, passwordHash, roles: ['admin', 'customer'] },
    { upsert: true },
  );
  console.log(`Admin account ready — email: ${ADMIN_EMAIL}, password: ${ADMIN_PASSWORD}`);
  console.log('Change this password after first login in a real deployment.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
