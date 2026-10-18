import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// This seed writes demo content and is not a production bootstrap path.
// Refuse to run it against a production environment by mistake; use
// `npm run admin:bootstrap` for the first production admin instead.
if (process.env.NODE_ENV === 'production') {
  console.error(
    'Refusing to run the demo seed with NODE_ENV=production. Use `npm run admin:bootstrap` for the first production admin.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

// First-admin bootstrap.
//
// No admin credentials are committed to source. The first admin is created only
// when the operator supplies BOTH env vars below at seed time:
//
//   SEED_ADMIN_EMAIL    e.g. owner@example.com
//   SEED_ADMIN_PASSWORD e.g. a strong, operator-chosen password
//
// Behaviour:
//   - Both set   -> create the admin if it does not already exist.
//                   If the email already exists, this is a NO-OP: the existing
//                   password (and name) are left untouched, so re-running the
//                   seed never resets a rotated password.
//   - Both unset -> skip admin bootstrap entirely (menu/content seeding only).
//   - One set    -> fail loudly; a half-configured bootstrap is a mistake.
//
// Secrets are never logged. Only the email (safe identifier) may be logged.
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim();
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME?.trim() || 'Admin';

function hasEnv(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

const BRANCHES = [
  {
    branchId: 'branch-baturaja-01',
    name: 'Raccoon Coffee Baturaja',
    address: 'Bakung, Baturaja',
    city: 'Baturaja',
    province: 'Sumatera Selatan',
    postalCode: null,
    openingTime: new Date('1970-01-01T13:00:00.000Z'),
    closingTime: new Date('1970-01-01T23:00:00.000Z'),
    phone: null,
    mapsUrl: 'https://maps.google.com/?q=Raccoon+Coffee+Baturaja',
    isActive: true,
  },
];

// Eight categories, one per available crayon icon in
// frontend/public/images/menu-icons/. The official menu's sub-group headings
// (Coffee White, Coffee Black, Frappe, ...) have no field in the locked
// schema, so they are flattened into these categories in PDF order via
// displayOrder.
const CATEGORIES = [
  { categoryId: 'cat-coffee', name: 'Coffee', slug: 'coffee', displayOrder: 1, icon: 'coffee.webp' },
  { categoryId: 'cat-milk', name: 'Milk Base', slug: 'milk-base', displayOrder: 2, icon: 'milk-based.webp' },
  { categoryId: 'cat-matcha', name: 'Matcha - Choco', slug: 'matcha-choco', displayOrder: 3, icon: 'matcha.webp' },
  { categoryId: 'cat-non', name: 'Tea Series', slug: 'tea-series', displayOrder: 4, icon: 'tea.webp' },
  { categoryId: 'cat-refreshing', name: 'Refreshing Drinks', slug: 'refreshing-drinks', displayOrder: 5, icon: 'refreshing-drinks.webp' },
  { categoryId: 'cat-cold', name: 'Cold Drinks', slug: 'cold-drinks', displayOrder: 6, icon: 'frappe.webp' },
  { categoryId: 'cat-food', name: 'Main Food', slug: 'main-food', displayOrder: 7, icon: 'food.webp' },
  { categoryId: 'cat-bites', name: 'Snacks and Desserts', slug: 'snacks-and-desserts', displayOrder: 8, icon: 'snacks-dessert.webp' },
];

type SeedProduct = {
  productId: string;
  categoryId: string;
  name: string;
  slug: string;
  price: string;
  imageUrl?: string | null;
  displayOrder: number;
};

// Prices verbatim from the official menu PDF (24K = Rp24,000).
// No descriptions: the PDF carries none and none are fabricated.
const PRODUCTS: SeedProduct[] = [
  // Coffee — Coffee White, Coffee Black, Filter Manual, Additional
  { productId: 'p-signature-coffee-raccoon', categoryId: 'cat-coffee', name: 'Signature Coffee Raccoon', slug: 'signature-coffee-raccoon', price: '24000', displayOrder: 1 },
  { productId: 'p-palm-sugar-raccoon', categoryId: 'cat-coffee', name: 'Palm Sugar Raccoon', slug: 'palm-sugar-raccoon', price: '24000', displayOrder: 2 },
  { productId: 'p-caramel-machiato', categoryId: 'cat-coffee', name: 'Caramel Machiato', slug: 'caramel-machiato', price: '27000', displayOrder: 3 },
  { productId: 'p-butterscotch-sea-salt', categoryId: 'cat-coffee', name: 'Butterscotch Sea-Salt', slug: 'butterscotch-sea-salt', price: '28000', displayOrder: 4 },
  { productId: 'p-tiramisu-buttercream', categoryId: 'cat-coffee', name: 'Tiramisu Buttercream', slug: 'tiramisu-buttercream', price: '28000', displayOrder: 5 },
  { productId: 'p-coco-creamy-latte', categoryId: 'cat-coffee', name: 'Coco Creamy Latte', slug: 'coco-creamy-latte', price: '26000', displayOrder: 6 },
  { productId: 'p-spanish-latte', categoryId: 'cat-coffee', name: 'Spanish Latte', slug: 'spanish-latte', price: '24000', displayOrder: 7 },
  { productId: 'p-triple-cheesee-latte', categoryId: 'cat-coffee', name: 'Triple Cheesee Latte', slug: 'triple-cheesee-latte', price: '28000', displayOrder: 8 },
  { productId: 'p-coffee-latte-hot-ice', categoryId: 'cat-coffee', name: 'Coffee Latte (Hot/Ice)', slug: 'coffee-latte-hot-ice', price: '22000', imageUrl: '/images/raccoon/menu/coffee/latte.jpg', displayOrder: 9 },
  { productId: 'p-coffee-latte-flavoured', categoryId: 'cat-coffee', name: 'Coffee Latte Flavoured', slug: 'coffee-latte-flavoured', price: '27000', displayOrder: 10 },
  { productId: 'p-affogato', categoryId: 'cat-coffee', name: 'Affogato', slug: 'affogato', price: '27000', displayOrder: 11 },
  { productId: 'p-signature-americano', categoryId: 'cat-coffee', name: 'Signature Americano', slug: 'signature-americano', price: '26000', displayOrder: 12 },
  { productId: 'p-americano-hot-ice', categoryId: 'cat-coffee', name: 'Americano (Hot/Ice)', slug: 'americano-hot-ice', price: '20000', displayOrder: 13 },
  { productId: 'p-black-peach-americano', categoryId: 'cat-coffee', name: 'Black Peach Americano', slug: 'black-peach-americano', price: '22000', displayOrder: 14 },
  { productId: 'p-beer-americano', categoryId: 'cat-coffee', name: 'Beer Americano', slug: 'beer-americano', price: '22000', displayOrder: 15 },
  { productId: 'p-berry-americano', categoryId: 'cat-coffee', name: 'Berry Americano', slug: 'berry-americano', price: '22000', displayOrder: 16 },
  { productId: 'p-v60-hot', categoryId: 'cat-coffee', name: 'V60 (Hot)', slug: 'v60-hot', price: '26000', imageUrl: '/images/raccoon/menu/coffee/pourover.jpg', displayOrder: 17 },
  { productId: 'p-japanese-ice', categoryId: 'cat-coffee', name: 'Japanese (Ice)', slug: 'japanese-ice', price: '26000', displayOrder: 18 },
  { productId: 'p-vietnam-drip', categoryId: 'cat-coffee', name: 'Vietnam Drip', slug: 'vietnam-drip', price: '18000', displayOrder: 19 },
  { productId: 'p-tubruk', categoryId: 'cat-coffee', name: 'Tubruk', slug: 'tubruk', price: '15000', displayOrder: 20 },
  // Additional: espresso shots and oat milk are add-ons on the printed menu.
  { productId: 'prod-coffee-espresso', categoryId: 'cat-coffee', name: 'Espresso', slug: 'espresso', price: '3000', imageUrl: '/images/raccoon/menu/coffee/espresso.jpg', displayOrder: 21 },
  { productId: 'p-oat-milk', categoryId: 'cat-coffee', name: 'Oat Milk', slug: 'oat-milk', price: '4000', displayOrder: 22 },

  // Milk Base
  { productId: 'p-cendol-raccoon', categoryId: 'cat-milk', name: 'Cendol Raccoon', slug: 'cendol-raccoon', price: '23000', displayOrder: 1 },
  { productId: 'p-sucang-susu-kacang', categoryId: 'cat-milk', name: 'Sucang "Susu Kacang"', slug: 'sucang-susu-kacang', price: '25000', displayOrder: 2 },
  { productId: 'p-raccoon-milk', categoryId: 'cat-milk', name: 'Raccoon Milk', slug: 'raccoon-milk', price: '22000', displayOrder: 3 },
  { productId: 'p-korean-strawberry-milk', categoryId: 'cat-milk', name: 'Korean Strawberry Milk', slug: 'korean-strawberry-milk', price: '26000', displayOrder: 4 },
  { productId: 'p-cookies-cream', categoryId: 'cat-milk', name: 'Cookies & Cream', slug: 'cookies-cream', price: '25000', displayOrder: 5 },
  { productId: 'p-butterscotch-milk', categoryId: 'cat-milk', name: 'Butterscotch Milk', slug: 'butterscotch-milk', price: '25000', displayOrder: 6 },

  // Matcha - Choco
  { productId: 'p-matcha-raccoon', categoryId: 'cat-matcha', name: 'Matcha Raccoon', slug: 'matcha-raccoon', price: '25000', displayOrder: 1 },
  { productId: 'p-matcha-sea-salt', categoryId: 'cat-matcha', name: 'Matcha Sea-Salt', slug: 'matcha-sea-salt', price: '28000', displayOrder: 2 },
  { productId: 'p-strawberry-matcha', categoryId: 'cat-matcha', name: 'Strawberry Matcha', slug: 'strawberry-matcha', price: '29000', displayOrder: 3 },
  { productId: 'p-hazelnut-matcha', categoryId: 'cat-matcha', name: 'Hazelnut Matcha', slug: 'hazelnut-matcha', price: '27000', displayOrder: 4 },
  { productId: 'p-pistachio-matcha', categoryId: 'cat-matcha', name: 'Pistachio Matcha', slug: 'pistachio-matcha', price: '27000', displayOrder: 5 },
  { productId: 'p-pure-matcha', categoryId: 'cat-matcha', name: 'Pure Matcha', slug: 'pure-matcha', price: '26000', displayOrder: 6 },
  { productId: 'p-choco-raccoon', categoryId: 'cat-matcha', name: 'Choco Raccoon', slug: 'choco-raccoon', price: '22000', displayOrder: 7 },
  { productId: 'p-hazelnut-choco', categoryId: 'cat-matcha', name: 'Hazelnut Choco', slug: 'hazelnut-choco', price: '25000', displayOrder: 8 },
  { productId: 'p-pistachio-choco', categoryId: 'cat-matcha', name: 'Pistachio Choco', slug: 'pistachio-choco', price: '26000', displayOrder: 9 },

  // Tea Series
  { productId: 'p-lychee-tea', categoryId: 'cat-non', name: 'Lychee Tea', slug: 'lychee-tea', price: '22000', displayOrder: 1 },
  { productId: 'p-osmantus-tea-raccoon', categoryId: 'cat-non', name: 'Osmantus Tea Raccoon', slug: 'osmantus-tea-raccoon', price: '22000', displayOrder: 2 },
  { productId: 'p-yuzu-tea-raccoon', categoryId: 'cat-non', name: 'Yuzu Tea Raccoon', slug: 'yuzu-tea-raccoon', price: '20000', displayOrder: 3 },
  { productId: 'prod-non-lemon-tea', categoryId: 'cat-non', name: 'Lemon Tea', slug: 'lemon-tea', price: '17000', imageUrl: '/images/raccoon/menu/noncoffee/lemon-tea.jpg', displayOrder: 4 },
  { productId: 'p-milk-tea-raccoon', categoryId: 'cat-non', name: 'Milk Tea Raccoon', slug: 'milk-tea-raccoon', price: '21000', displayOrder: 5 },
  { productId: 'p-wedang-jahe-hot', categoryId: 'cat-non', name: 'Wedang Jahe (Hot)', slug: 'wedang-jahe-hot', price: '15000', displayOrder: 6 },

  // Refreshing Drinks — Free Beer + Soda Series
  { productId: 'p-rum-beer', categoryId: 'cat-refreshing', name: 'Rum Beer', slug: 'rum-beer', price: '27000', displayOrder: 1 },
  { productId: 'p-sangria-beer', categoryId: 'cat-refreshing', name: 'Sangria Beer', slug: 'sangria-beer', price: '28000', displayOrder: 2 },
  { productId: 'p-berry-berry-beer', categoryId: 'cat-refreshing', name: 'Berry Berry Beer', slug: 'berry-berry-beer', price: '28000', displayOrder: 3 },
  { productId: 'p-summer-soda', categoryId: 'cat-refreshing', name: 'Summer Soda', slug: 'summer-soda', price: '26000', displayOrder: 4 },
  { productId: 'p-mojito-series', categoryId: 'cat-refreshing', name: 'Mojito Series', slug: 'mojito-series', price: '20000', displayOrder: 5 },
  { productId: 'p-yakult-series', categoryId: 'cat-refreshing', name: 'Yakult Series', slug: 'yakult-series', price: '24000', displayOrder: 6 },

  // Cold Drinks — Frappe + Smoothies Bowl
  { productId: 'p-lotus-caramel-frappe', categoryId: 'cat-cold', name: 'Lotus Caramel Frappe', slug: 'lotus-caramel-frappe', price: '32000', displayOrder: 1 },
  { productId: 'p-cookies-cream-frappe', categoryId: 'cat-cold', name: 'Cookies & Cream Frappe', slug: 'cookies-cream-frappe', price: '32000', displayOrder: 2 },
  { productId: 'p-avocado-v-frappe', categoryId: 'cat-cold', name: 'Avocado V Frappe', slug: 'avocado-v-frappe', price: '33000', displayOrder: 3 },
  { productId: 'p-strawberry-frappe', categoryId: 'cat-cold', name: 'Strawberry Frappe', slug: 'strawberry-frappe', price: '35000', displayOrder: 4 },
  { productId: 'p-matcha-frappe', categoryId: 'cat-cold', name: 'Matcha Frappe', slug: 'matcha-frappe', price: '33000', displayOrder: 5 },
  { productId: 'p-choco-frappe', categoryId: 'cat-cold', name: 'Choco Frappe', slug: 'choco-frappe', price: '33000', displayOrder: 6 },
  { productId: 'p-choco-pistachio-frappe', categoryId: 'cat-cold', name: 'Choco Pistachio Frappe', slug: 'choco-pistachio-frappe', price: '35000', displayOrder: 7 },
  { productId: 'p-strawberry-smoothies', categoryId: 'cat-cold', name: 'Strawberry Smoothies', slug: 'strawberry-smoothies', price: '42000', displayOrder: 8 },
  { productId: 'p-pineapple-smoothies', categoryId: 'cat-cold', name: 'Pineapple Smoothies', slug: 'pineapple-smoothies', price: '35000', displayOrder: 9 },
  { productId: 'p-dragon-fruit-smoothies', categoryId: 'cat-cold', name: 'Dragon Fruit Smoothies', slug: 'dragon-fruit-smoothies', price: '35000', displayOrder: 10 },
  { productId: 'p-banana-choco-smoothies', categoryId: 'cat-cold', name: 'Banana Choco Smoothies', slug: 'banana-choco-smoothies', price: '35000', displayOrder: 11 },

  // Main Food
  { productId: 'p-original-bakmie', categoryId: 'cat-food', name: 'Original Bakmie', slug: 'original-bakmie', price: '20000', displayOrder: 1 },
  { productId: 'p-bakmie-topping', categoryId: 'cat-food', name: 'Bakmie Topping', slug: 'bakmie-topping', price: '23000', displayOrder: 2 },
  { productId: 'p-bakmie-full-topping', categoryId: 'cat-food', name: 'Bakmie Full Topping', slug: 'bakmie-full-topping', price: '26000', displayOrder: 3 },
  { productId: 'p-truffle-pasta', categoryId: 'cat-food', name: 'Truffle Pasta', slug: 'truffle-pasta', price: '40000', displayOrder: 4 },
  { productId: 'p-carbonara', categoryId: 'cat-food', name: 'Carbonara', slug: 'carbonara', price: '33000', displayOrder: 5 },
  { productId: 'p-oglio-e-olio', categoryId: 'cat-food', name: 'Oglio E Olio', slug: 'oglio-e-olio', price: '33000', displayOrder: 6 },
  { productId: 'p-mac-n-cheese', categoryId: 'cat-food', name: 'Mac N Cheese', slug: 'mac-n-cheese', price: '35000', displayOrder: 7 },
  { productId: 'p-ayam-suwir-raccoon', categoryId: 'cat-food', name: 'Ayam Suwir Raccoon', slug: 'ayam-suwir-raccoon', price: '25000', displayOrder: 8 },
  { productId: 'p-beef-black-pepper-raccoon', categoryId: 'cat-food', name: 'Beef Black Pepper Raccoon', slug: 'beef-black-pepper-raccoon', price: '35000', displayOrder: 9 },
  { productId: 'p-sambal-cumi-asin-raccoon', categoryId: 'cat-food', name: 'Sambal Cumi Asin Raccoon', slug: 'sambal-cumi-asin-raccoon', price: '28000', displayOrder: 10 },
  { productId: 'p-ayam-bumbu-hitam-madura', categoryId: 'cat-food', name: 'Ayam Bumbu Hitam Madura', slug: 'ayam-bumbu-hitam-madura', price: '33000', displayOrder: 11 },
  { productId: 'p-bebek-bumbu-hitam-madura', categoryId: 'cat-food', name: 'Bebek Bumbu Hitam Madura', slug: 'bebek-bumbu-hitam-madura', price: '40000', displayOrder: 12 },
  { productId: 'p-nasi-goreng-raccoon', categoryId: 'cat-food', name: 'Nasi Goreng Raccoon', slug: 'nasi-goreng-raccoon', price: '33000', displayOrder: 13 },
  { productId: 'p-nasi-goreng-ebi', categoryId: 'cat-food', name: 'Nasi Goreng Ebi', slug: 'nasi-goreng-ebi', price: '35000', displayOrder: 14 },
  { productId: 'p-nasi-goreng-bawang', categoryId: 'cat-food', name: 'Nasi Goreng Bawang', slug: 'nasi-goreng-bawang', price: '29000', displayOrder: 15 },
  { productId: 'p-hiro-burger-french-fries', categoryId: 'cat-food', name: 'Hiro Burger - French Fries', slug: 'hiro-burger-french-fries', price: '35000', displayOrder: 16 },
  { productId: 'p-toto-burger', categoryId: 'cat-food', name: 'Toto Burger', slug: 'toto-burger', price: '40000', displayOrder: 17 },
  { productId: 'p-selam', categoryId: 'cat-food', name: 'Selam', slug: 'selam', price: '20000', displayOrder: 18 },
  { productId: 'p-pempek-telur-isi-5', categoryId: 'cat-food', name: 'Pempek Telur - Isi 5', slug: 'pempek-telur-isi-5', price: '18000', displayOrder: 19 },
  { productId: 'p-pempek-lenjer-isi-5', categoryId: 'cat-food', name: 'Pempek Lenjer - Isi 5', slug: 'pempek-lenjer-isi-5', price: '18000', displayOrder: 20 },
  { productId: 'p-pempek-adaan-isi-5', categoryId: 'cat-food', name: 'Pempek Adaan - Isi 5', slug: 'pempek-adaan-isi-5', price: '18000', displayOrder: 21 },
  { productId: 'p-pempek-kulit-isi-5', categoryId: 'cat-food', name: 'Pempek Kulit - Isi 5', slug: 'pempek-kulit-isi-5', price: '18000', displayOrder: 22 },
  { productId: 'p-pempek-mix-isi-5', categoryId: 'cat-food', name: 'Pempek Mix - Isi 5', slug: 'pempek-mix-isi-5', price: '18000', displayOrder: 23 },

  // Snacks and Desserts — Savory, Sweet, Dessert, Toast
  { productId: 'p-tahu-walik-isi-6', categoryId: 'cat-bites', name: 'Tahu Walik - Isi 6', slug: 'tahu-walik-isi-6', price: '17000', displayOrder: 1 },
  { productId: 'p-french-fries', categoryId: 'cat-bites', name: 'French Fries', slug: 'french-fries', price: '18000', displayOrder: 2 },
  { productId: 'p-mix-plater', categoryId: 'cat-bites', name: 'Mix Plater', slug: 'mix-plater', price: '25000', displayOrder: 3 },
  { productId: 'p-risol-mayo-isi-4', categoryId: 'cat-bites', name: 'Risol Mayo - Isi 4', slug: 'risol-mayo-isi-4', price: '20000', displayOrder: 4 },
  { productId: 'p-dimsum-goreng-kukus-isi-4', categoryId: 'cat-bites', name: 'Dimsum Goreng / Kukus - Isi 4', slug: 'dimsum-goreng-kukus-isi-4', price: '20000', displayOrder: 5 },
  { productId: 'p-pangsit-goreng-isi-6', categoryId: 'cat-bites', name: 'Pangsit Goreng - Isi 6', slug: 'pangsit-goreng-isi-6', price: '20000', displayOrder: 6 },
  { productId: 'p-ubee-toto', categoryId: 'cat-bites', name: 'Ubee Toto', slug: 'ubee-toto', price: '20000', displayOrder: 7 },
  { productId: 'p-risol-coklat-isi-4', categoryId: 'cat-bites', name: 'Risol Coklat - Isi 4', slug: 'risol-coklat-isi-4', price: '20000', displayOrder: 8 },
  { productId: 'p-pisang-goreng-madu', categoryId: 'cat-bites', name: 'Pisang Goreng Madu', slug: 'pisang-goreng-madu', price: '19000', displayOrder: 9 },
  { productId: 'p-pisang-goreng-wijen', categoryId: 'cat-bites', name: 'Pisang Goreng Wijen', slug: 'pisang-goreng-wijen', price: '18000', displayOrder: 10 },
  { productId: 'p-keju-aroma', categoryId: 'cat-bites', name: 'Keju Aroma', slug: 'keju-aroma', price: '17000', displayOrder: 11 },
  { productId: 'p-burnt-cheesecake', categoryId: 'cat-bites', name: 'Burnt Cheesecake', slug: 'burnt-cheesecake', price: '26000', displayOrder: 12 },
  { productId: 'p-burnt-cheesecake-variant', categoryId: 'cat-bites', name: 'Burnt Cheesecake - Variant', slug: 'burnt-cheesecake-variant', price: '23000', displayOrder: 13 },
  { productId: 'p-banana-pudding', categoryId: 'cat-bites', name: 'Banana Pudding', slug: 'banana-pudding', price: '23000', displayOrder: 14 },
  { productId: 'p-pudding-caramel', categoryId: 'cat-bites', name: 'Pudding Caramel', slug: 'pudding-caramel', price: '18000', displayOrder: 15 },
  { productId: 'p-pudizu-pudding-yuzu', categoryId: 'cat-bites', name: 'Pudizu (Pudding Yuzu)', slug: 'pudizu-pudding-yuzu', price: '17000', displayOrder: 16 },
  { productId: 'p-caramel-toast-raccoon', categoryId: 'cat-bites', name: 'Caramel Toast Raccoon', slug: 'caramel-toast-raccoon', price: '26000', displayOrder: 17 },
  { productId: 'p-caramel-toast-nutella', categoryId: 'cat-bites', name: 'Caramel Toast Nutella', slug: 'caramel-toast-nutella', price: '23000', displayOrder: 18 },
];

const STORIES = [
  {
    storyId: 'story-1',
    title: 'Coffee and Chill di Baturaja',
    slug: 'coffee-and-chill-di-baturaja',
    content:
      'Raccoon Coffee Baturaja adalah tempat untuk ngopi, makan, dan bersantai di Bakung, Baturaja. Buka Selasa–Minggu, 13.00–23.00.',
    coverImageUrl: '/images/raccoon/atmosphere/interior.jpg',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2026-10-01T00:00:00.000Z'),
  },
];

const EVENTS = [
  {
    eventId: 'event-1',
    title: 'Live Acoustic Night',
    slug: 'live-acoustic-night',
    description: 'Nikmati malam minggu dengan live music acoustic dari band lokal Baturaja.',
    coverImageUrl: null,
    eventDate: new Date('2026-11-14T00:00:00.000Z'),
    startTime: new Date('1970-01-01T19:30:00.000Z'),
    endTime: new Date('1970-01-01T23:00:00.000Z'),
    status: 'PUBLISHED' as const,
  },
  {
    eventId: 'event-2',
    title: 'Coffee Cupping & Brewing',
    slug: 'coffee-cupping-and-brewing',
    description: 'Belajar cara menyeduh kopi manual bersama barista kami. Gratis!',
    coverImageUrl: null,
    eventDate: new Date('2026-11-21T00:00:00.000Z'),
    startTime: new Date('1970-01-01T15:00:00.000Z'),
    endTime: new Date('1970-01-01T17:00:00.000Z'),
    status: 'PUBLISHED' as const,
  },
];

const PHOTOS = [
  { photoId: 'photo-1', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/morning.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-10-04T09:12:00Z') },
  { photoId: 'photo-2', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/conversation.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-10-03T14:20:00Z') },
  { photoId: 'photo-3', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/cafe-moment.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-10-02T11:05:00Z') },
  { photoId: 'photo-4', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/friends.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-10-01T16:45:00Z') },
  { photoId: 'photo-5', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/candid.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-09-30T08:30:00Z') },
  { photoId: 'photo-6', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/coffee-date.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-09-29T15:10:00Z') },
  { photoId: 'photo-7', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/laughing.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-09-28T13:40:00Z') },
  { photoId: 'photo-8', visitorName: 'Anonymous', caption: null, imageUrl: '/images/raccoon/wall/group.jpg', status: 'APPROVED' as const, createdAt: new Date('2026-09-27T10:15:00Z') },
];

// Legacy/demo products from the old four-category mock menu. They stay in the
// table as INACTIVE instead of being deleted so nothing is destroyed, and so
// an admin can reactivate them.
const RETIRED_PRODUCT_IDS = [
  '3f372eb1-3b1d-4e60-be15-d63f674047bb', // TestProd
  'prod-coffee-americano',
  'prod-coffee-pourover',
  'prod-coffee-beans',
  'prod-coffee-coldbrew',
  'prod-coffee-mocha',
  'prod-coffee-latte',
  'prod-coffee-cappuccino',
  'prod-milk-strawberry',
  'prod-milk-chocolate',
  'prod-milk-vanilla',
  'prod-milk-fresh',
  'prod-milk-creamy',
  'prod-non-matcha',
  'prod-non-tea',
  'prod-non-chocolate',
  'prod-non-iced',
  'prod-5',
  'prod-6',
];

async function bootstrapAdmin() {
  const hasEmail = hasEnv(SEED_ADMIN_EMAIL);
  const hasPassword = hasEnv(SEED_ADMIN_PASSWORD);

  // Neither set: fresh/demo seed without admin bootstrap. Safe no-op.
  if (!hasEmail && !hasPassword) {
    console.log(
      'Seed: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin bootstrap.',
    );
    return;
  }

  // Half-configured: refuse rather than guess.
  if (!hasEmail || !hasPassword) {
    throw new Error(
      'Seed: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set together to bootstrap the first admin.',
    );
  }

  const email = SEED_ADMIN_EMAIL as string;
  const password = SEED_ADMIN_PASSWORD as string;

  // Create-only. Never update an existing admin, so re-seeding cannot reset a
  // password the operator has since rotated.
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(
      `Seed: admin ${email} already exists — leaving credentials unchanged.`,
    );
    return;
  }

  // Hash at runtime; the plaintext is never persisted or logged.
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.create({
    data: { name: SEED_ADMIN_NAME, email, passwordHash },
  });

  console.log(`Seed: created first admin ${email}.`);
}

async function main() {
  await bootstrapAdmin();

  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { branchId: branch.branchId },
      update: {
        name: branch.name,
        address: branch.address,
        city: branch.city,
        province: branch.province,
        postalCode: branch.postalCode,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime,
        phone: branch.phone,
        mapsUrl: branch.mapsUrl,
        isActive: branch.isActive,
      },
      create: branch,
    });
  }

  for (const { icon: _icon, ...cat } of CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { categoryId: cat.categoryId },
      update: { name: cat.name, slug: cat.slug, displayOrder: cat.displayOrder },
      create: cat,
    });
  }

  for (const prod of PRODUCTS) {
    await prisma.product.upsert({
      where: { productId: prod.productId },
      update: {
        categoryId: prod.categoryId,
        name: prod.name,
        slug: prod.slug,
        description: null,
        price: prod.price,
        imageUrl: prod.imageUrl ?? null,
        status: 'ACTIVE',
        displayOrder: prod.displayOrder,
      },
      create: {
        productId: prod.productId,
        categoryId: prod.categoryId,
        name: prod.name,
        slug: prod.slug,
        description: null,
        price: prod.price,
        imageUrl: prod.imageUrl ?? null,
        status: 'ACTIVE',
        displayOrder: prod.displayOrder,
      },
    });
  }

  const retired = await prisma.product.updateMany({
    where: { productId: { in: RETIRED_PRODUCT_IDS } },
    data: { status: 'INACTIVE' },
  });

  for (const story of STORIES) {
    await prisma.story.upsert({
      where: { storyId: story.storyId },
      update: {
        title: story.title,
        slug: story.slug,
        content: story.content,
        coverImageUrl: story.coverImageUrl,
        status: story.status,
        publishedAt: story.publishedAt,
      },
      create: story,
    });
  }

  for (const event of EVENTS) {
    await prisma.event.upsert({
      where: { eventId: event.eventId },
      update: {
        title: event.title,
        slug: event.slug,
        description: event.description,
        coverImageUrl: event.coverImageUrl,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        status: event.status,
      },
      create: event,
    });
  }

  for (const photo of PHOTOS) {
    await prisma.photoUpload.upsert({
      where: { photoId: photo.photoId },
      update: {
        visitorName: photo.visitorName,
        caption: photo.caption,
        imageUrl: photo.imageUrl,
        status: photo.status,
        createdAt: photo.createdAt,
      },
      create: photo,
    });
  }

  console.log(
    `Seeded ${BRANCHES.length} branches, ${CATEGORIES.length} categories, ${PRODUCTS.length} official menu products; retired ${retired.count} legacy products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());