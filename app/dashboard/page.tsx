import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, Heart, Bookmark } from "lucide-react";

export default function DashboardPage() {
  // Placeholder stats - will be replaced with real data
  const stats = [
    { title: "Total Posts", value: "0", icon: FileText },
    { title: "Total Views", value: "0", icon: Eye },
    { title: "Total Likes", value: "0", icon: Heart },
    { title: "Bookmarks", value: "0", icon: Bookmark },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your blog."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              You haven't created any posts yet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
