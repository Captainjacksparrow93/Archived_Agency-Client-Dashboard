'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import {
  Palette, Video, Film, Share2, PenTool, Megaphone, Globe, Users,
  IndianRupee, ArrowRight, Loader2, Search
} from 'lucide-react'

interface ServiceItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  unit: string
}

const categoryIcons: Record<string, any> = {
  'Design': Palette,
  'AI Video': Video,
  'Video Editing': Film,
  'Social Media': Share2,
  'Content Writing': PenTool,
  'Paid Ads': Megaphone,
  'Web': Globe,
  'Consulting': Users,
}

const categoryColors: Record<string, string> = {
  'Design': 'from-pink-500 to-rose-500',
  'AI Video': 'from-purple-500 to-indigo-500',
  'Video Editing': 'from-blue-500 to-cyan-500',
  'Social Media': 'from-green-500 to-emerald-500',
  'Content Writing': 'from-amber-500 to-orange-500',
  'Paid Ads': 'from-red-500 to-pink-500',
  'Web': 'from-indigo-500 to-blue-500',
  'Consulting': 'from-teal-500 to-cyan-500',
}

export default function ServicesPage() {
  const [grouped, setGrouped] = useState<Record<string, ServiceItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((data) => setGrouped(data.grouped))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, items]) => {
    const filtered = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        cat.toLowerCase().includes(search.toLowerCase())
    )
    if (filtered.length > 0) acc[cat] = filtered
    return acc
  }, {} as Record<string, ServiceItem[]>)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
            <p className="text-gray-500 mt-1">Browse our services and pricing</p>
          </div>
          <Link href="/tasks/new" className="btn-primary flex items-center gap-2 w-fit">
            Create Task <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search */}
        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-10"
          />
        </div>
      </div>

      <div className="space-y-10">
        {Object.entries(filteredGrouped).map(([category, items]) => {
          const Icon = categoryIcons[category] || Palette
          const gradient = categoryColors[category] || 'from-gray-500 to-gray-600'

          return (
            <div key={category}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{category}</h2>
                <span className="text-sm text-gray-400">({items.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="card group hover:border-blue-200">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-green-600" />
                        <span className="text-lg font-bold text-gray-900">
                          {item.price.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
