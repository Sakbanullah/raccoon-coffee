import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { categoryId: 'cat-coffee', name: 'Kopi Susu & Espresso', slug: 'kopi-susu-espresso', displayOrder: 1 },
  { categoryId: 'cat-milk', name: 'Milky Beverages', slug: 'milky-beverages', displayOrder: 2 },
  { categoryId: 'cat-non', name: 'Bukan Kopi', slug: 'bukan-kopi', displayOrder: 3 },
  { categoryId: 'cat-bites', name: 'Teman Ngopi', slug: 'teman-ngopi', displayOrder: 4 },
];

const PRODUCTS = [
  { productId: 'prod-coffee-espresso', categoryId: 'cat-coffee', name: 'Espresso', slug: 'espresso', description: 'Espresso.', price: '24000.00', imageUrl: '/images/raccoon/menu/coffee/espresso.jpg', status: 'ACTIVE', displayOrder: 1 },
  { productId: 'prod-coffee-americano', categoryId: 'cat-coffee', name: 'Americano', slug: 'americano', description: 'Espresso, air panas.', price: '26000.00', imageUrl: '/images/raccoon/menu/coffee/americano.jpg', status: 'ACTIVE', displayOrder: 2 },
  { productId: 'prod-coffee-pourover', categoryId: 'cat-coffee', name: 'Pour Over', slug: 'pour-over', description: 'Kopi seduh manual.', price: '42000.00', imageUrl: '/images/raccoon/menu/coffee/pourover.jpg', status: 'ACTIVE', displayOrder: 3 },
  { productId: 'prod-coffee-beans', categoryId: 'cat-coffee', name: 'Coffee Beans', slug: 'coffee-beans', description: 'Kopi dalam kemasan 250 g.', price: '45000.00', imageUrl: '/images/raccoon/menu/coffee/beans.jpg', status: 'ACTIVE', displayOrder: 4 },
  { productId: 'prod-coffee-coldbrew', categoryId: 'cat-coffee', name: 'Cold Brew', slug: 'cold-brew', description: 'Kopi dingin.', price: '38000.00', imageUrl: '/images/raccoon/menu/coffee/coldbrew.jpg', status: 'ACTIVE', displayOrder: 5 },
  { productId: 'prod-coffee-mocha', categoryId: 'cat-coffee', name: 'Mocha', slug: 'mocha', description: 'Espresso, cokelat, dan susu.', price: '36000.00', imageUrl: '/images/raccoon/menu/coffee/mocha.jpg', status: 'ACTIVE', displayOrder: 6 },
  { productId: 'prod-coffee-latte', categoryId: 'cat-coffee', name: 'Latte', slug: 'latte', description: 'Espresso, susu panas.', price: '35000.00', imageUrl: '/images/raccoon/menu/coffee/latte.jpg', status: 'ACTIVE', displayOrder: 7 },
  { productId: 'prod-coffee-cappuccino', categoryId: 'cat-coffee', name: 'Cappuccino', slug: 'cappuccino', description: 'Espresso, busa tipis.', price: '35000.00', imageUrl: '/images/raccoon/menu/coffee/cappuccino.jpg', status: 'ACTIVE', displayOrder: 8 },
  { productId: 'prod-milk-strawberry', categoryId: 'cat-milk', name: 'Strawberry Milk', slug: 'strawberry-milk', description: 'Susunya segar.', price: '32000.00', imageUrl: '/images/raccoon/menu/milk/strawberry.jpg', status: 'ACTIVE', displayOrder: 1 },
  { productId: 'prod-milk-chocolate', categoryId: 'cat-milk', name: 'Chocolate Milk', slug: 'chocolate-milk', description: 'Susu cokelat.', price: '32000.00', imageUrl: '/images/raccoon/menu/milk/chocolate.jpg', status: 'ACTIVE', displayOrder: 2 },
  { productId: 'prod-milk-vanilla', categoryId: 'cat-milk', name: 'Vanilla Milk', slug: 'vanilla-milk', description: 'Susu vanila.', price: '32000.00', imageUrl: '/images/raccoon/menu/milk/vanilla.jpg', status: 'ACTIVE', displayOrder: 3 },
  { productId: 'prod-milk-fresh', categoryId: 'cat-milk', name: 'Fresh Milk', slug: 'fresh-milk', description: 'Susu segar.', price: '28000.00', imageUrl: '/images/raccoon/menu/milk/fresh.jpg', status: 'ACTIVE', displayOrder: 4 },
  { productId: 'prod-milk-creamy', categoryId: 'cat-milk', name: 'Creamy Milk', slug: 'creamy-milk', description: 'Susu kental.', price: '34000.00', imageUrl: '/images/raccoon/menu/milk/creamy.jpg', status: 'ACTIVE', displayOrder: 5 },
  { productId: 'prod-non-matcha', categoryId: 'cat-non', name: 'Matcha', slug: 'matcha', description: 'Matcha, susu, dan manis.', price: '33500.00', imageUrl: '/images/raccoon/menu/noncoffee/matcha.jpg', status: 'ACTIVE', displayOrder: 1 },
  { productId: 'prod-non-tea', categoryId: 'cat-non', name: 'Tea', slug: 'tea', description: 'Teh hitam.', price: '25000.00', imageUrl: '/images/raccoon/menu/noncoffee/tea.jpg', status: 'ACTIVE', displayOrder: 2 },
  { productId: 'prod-non-lemon-tea', categoryId: 'cat-non', name: 'Lemon Tea', slug: 'lemon-tea', description: 'Teh lemon.', price: '26000.00', imageUrl: '/images/raccoon/menu/noncoffee/lemon-tea.jpg', status: 'ACTIVE', displayOrder: 3 },
  { productId: 'prod-non-chocolate', categoryId: 'cat-non', name: 'Chocolate', slug: 'chocolate', description: 'Cokelat panas.', price: '27500.00', imageUrl: '/images/raccoon/menu/noncoffee/chocolate.jpg', status: 'ACTIVE', displayOrder: 4 },
  { productId: 'prod-non-iced', categoryId: 'cat-non', name: 'Iced Non-Coffee', slug: 'iced-non-coffee', description: 'Iced non-coffee beverage.', price: '28000.00', imageUrl: '/images/raccoon/menu/noncoffee/iced.jpg', status: 'ACTIVE', displayOrder: 5 },
  { productId: 'prod-5', categoryId: 'cat-bites', name: 'Roti Bakar Kaya Butter', slug: 'roti-bakar-kaya-butter', description: 'Roti panggang.', price: '32000.00', imageUrl: '/images/menu-5.svg', status: 'ACTIVE', displayOrder: 5 },
  { productId: 'prod-6', categoryId: 'cat-bites', name: 'Cinnamon Roll Hangat', slug: 'cinnamon-roll-hangat', description: 'Roti manis.', price: '30000.00', imageUrl: '/images/menu-6.svg', status: 'ACTIVE', displayOrder: 6 },
];

const STORIES = [
  {
    storyId: 'story-1',
    title: 'Coffee and Chill di Baturaja',
    slug: 'coffee-and-chill-di-baturaja',
    content:
      'Raccoon Coffee Baturaja adalah tempat untuk ngopi, makan, dan bersantai di Bakung, Baturaja. Buka Selasa–Minggu, 13.00–23.00.',
    coverImageUrl: '/images/raccoon/atmosphere/interior.jpg',
    status: 'PUBLISHED',
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
    status: 'PUBLISHED',
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
    status: 'PUBLISHED',
  }
];

const PHOTOS = [
  {
    photoId: "photo-1",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/morning.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-10-04T09:12:00Z"),
  },
  {
    photoId: "photo-2",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/conversation.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-10-03T14:20:00Z"),
  },
  {
    photoId: "photo-3",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/cafe-moment.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-10-02T11:05:00Z"),
  },
  {
    photoId: "photo-4",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/friends.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-10-01T16:45:00Z"),
  },
  {
    photoId: "photo-5",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/candid.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-09-30T08:30:00Z"),
  },
  {
    photoId: "photo-6",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/coffee-date.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-09-29T15:10:00Z"),
  },
  {
    photoId: "photo-7",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/laughing.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-09-28T13:40:00Z"),
  },
  {
    photoId: "photo-8",
    visitorName: "Anonymous",
    caption: null,
    imageUrl: "/images/raccoon/wall/group.jpg",
    status: "APPROVED",
    createdAt: new Date("2026-09-27T10:15:00Z"),
  },
];

const ADMINS = [
  {
    adminId: 'admin-1',
    name: 'Default Admin',
    email: 'admin@raccooncoffee.id',
    passwordHash: '$2b$10$eXPd1dGcCM2TFGDQWc7tJuplor7MgxvpTsGJ5Noxl8TLDDETZ37Yu', // password123
  },
];

async function main() {
  for (const admin of ADMINS) {
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: { name: admin.name, passwordHash: admin.passwordHash },
      create: admin,
    });
  }

  for (const cat of CATEGORIES) {
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
        description: prod.description,
        price: prod.price,
        imageUrl: prod.imageUrl,
        status: prod.status as 'ACTIVE',
        displayOrder: prod.displayOrder,
      },
      create: {
        ...prod,
        status: prod.status as 'ACTIVE',
      },
    });
  }

  for (const story of STORIES) {
    await prisma.story.upsert({
      where: { storyId: story.storyId },
      update: {
        title: story.title,
        slug: story.slug,
        content: story.content,
        coverImageUrl: story.coverImageUrl,
        status: story.status as 'PUBLISHED',
        publishedAt: story.publishedAt,
      },
      create: {
        ...story,
        status: story.status as 'PUBLISHED',
      },
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
        status: event.status as 'PUBLISHED',
      },
      create: {
        ...event,
        status: event.status as 'PUBLISHED',
      },
    });
  }

  for (const photo of PHOTOS) {
    await prisma.photoUpload.upsert({
      where: { photoId: photo.photoId },
      update: {
        visitorName: photo.visitorName,
        caption: photo.caption,
        imageUrl: photo.imageUrl,
        status: photo.status as 'APPROVED',
        createdAt: photo.createdAt,
      },
      create: {
        ...photo,
        status: photo.status as 'APPROVED',
      },
    });
  }

  console.log(`Seeded ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${STORIES.length} stories, ${EVENTS.length} events, and ${PHOTOS.length} photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
