import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@adflow.agency' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@adflow.agency',
      role: 'admin',
      permissions: JSON.stringify(['all']),
      wallet: { create: { balance: 0 } },
    },
  })

  // Create Project Manager user
  const pm = await prisma.user.upsert({
    where: { email: 'pm@adflow.agency' },
    update: {},
    create: {
      name: 'Rahul PM',
      email: 'pm@adflow.agency',
      role: 'pm',
      permissions: JSON.stringify(['task_update', 'eta_manage', 'chat', 'view_tasks']),
      wallet: { create: { balance: 0 } },
    },
  })

  // Create demo employee
  const empPassword = await bcrypt.hash('emp1234', 10)
  await prisma.user.upsert({
    where: { email: 'employee@adflow.agency' },
    update: {},
    create: {
      name: 'Priya Designer',
      email: 'employee@adflow.agency',
      password: empPassword,
      role: 'employee',
      employeeRole: 'Designer',
    },
  })

  // Create demo client
  const client = await prisma.user.upsert({
    where: { email: 'demo@client.com' },
    update: {},
    create: {
      name: 'Demo Client',
      email: 'demo@client.com',
      company: 'Demo Corp',
      role: 'client',
      wallet: { create: { balance: 5000 } },
    },
  })

  // Seed service items
  const services = [
    { name: 'Static Graphic Design', description: 'Single static creative for social media, ads, or print', category: 'Design', price: 500, unit: 'per piece', sortOrder: 1 },
    { name: 'Carousel Design (up to 10 slides)', description: 'Multi-slide carousel post for Instagram/LinkedIn', category: 'Design', price: 1500, unit: 'per set', sortOrder: 2 },
    { name: 'Logo Design', description: 'Brand logo with 3 concepts and 2 revision rounds', category: 'Design', price: 5000, unit: 'per project', sortOrder: 3 },
    { name: 'Brand Identity Kit', description: 'Logo + color palette + typography + brand guidelines', category: 'Design', price: 15000, unit: 'per project', sortOrder: 4 },
    { name: 'AI Video (30 sec)', description: 'AI-generated video with voiceover and motion graphics', category: 'AI Video', price: 2000, unit: 'per piece', sortOrder: 5 },
    { name: 'AI Video (60 sec)', description: 'AI-generated video with voiceover and motion graphics', category: 'AI Video', price: 3500, unit: 'per piece', sortOrder: 6 },
    { name: 'AI Reel / Short', description: 'AI-powered short-form vertical video for Reels/Shorts', category: 'AI Video', price: 1500, unit: 'per piece', sortOrder: 7 },
    { name: 'Basic Video Edit', description: 'Simple cuts, transitions, text overlays, and color correction', category: 'Video Editing', price: 1000, unit: 'per minute', sortOrder: 8 },
    { name: 'Advanced Video Edit', description: 'Complex editing with effects, motion graphics, sound design', category: 'Video Editing', price: 2500, unit: 'per minute', sortOrder: 9 },
    { name: 'Product Video', description: 'Professional product showcase video with B-roll', category: 'Video Editing', price: 5000, unit: 'per project', sortOrder: 10 },
    { name: 'Social Media Management (Monthly)', description: 'Content planning, 20 posts, scheduling, basic analytics', category: 'Social Media', price: 15000, unit: 'per month', sortOrder: 11 },
    { name: 'Single Social Post Copy', description: 'Engaging caption with hashtags for a single post', category: 'Content Writing', price: 200, unit: 'per piece', sortOrder: 12 },
    { name: 'Blog Article (1000 words)', description: 'SEO-optimized blog post with research', category: 'Content Writing', price: 2000, unit: 'per piece', sortOrder: 13 },
    { name: 'Ad Campaign Setup', description: 'Setup and launch of Meta/Google ad campaign', category: 'Paid Ads', price: 3000, unit: 'per campaign', sortOrder: 14 },
    { name: 'Landing Page Design', description: 'Conversion-optimized landing page design', category: 'Web', price: 8000, unit: 'per page', sortOrder: 15 },
    { name: 'UI/UX Consultation (1 hour)', description: 'Expert consultation on design and user experience', category: 'Consulting', price: 2000, unit: 'per hour', sortOrder: 16 },
  ]

  for (const service of services) {
    await prisma.serviceItem.upsert({
      where: { id: service.name.toLowerCase().replace(/[^a-z0-9]/g, '-') },
      update: service,
      create: {
        id: service.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ...service,
      },
    })
  }

  console.log('Database seeded successfully!')
  console.log(`Admin: admin@adflow.agency / admin1234`)
  console.log(`Project Manager: pm@adflow.agency / pm1234`)
  console.log(`Employee: employee@adflow.agency / emp1234`)
  console.log(`Demo Client: demo@client.com / demo1234`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
