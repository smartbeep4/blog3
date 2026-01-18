"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function PostsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Post
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium md:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium lg:table-cell">
                  Stats
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium sm:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-16 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="ml-auto h-8 w-8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
