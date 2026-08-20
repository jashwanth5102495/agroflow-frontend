import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, Store } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "http://127.0.0.1:5000/api/v1";

export default function AdminReportsPage() {
  const [stats, setStats] = useState({
    totalShops: 0,
    totalUsers: 0,
    activeShops: 0,
    monthlyRevenue: 0,
    newShopsThisWeek: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`);
        const data = await response.json();
        if (response.ok && data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats for reports:", err);
      }
    };
    fetchStats();
  }, []);

  const handleDownload = (reportName: string) => {
    toast.info(`Generating ${reportName}...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Platform Reports</h2>
        <p className="text-muted-foreground">
          System-wide analytics, revenue reports, and shop performance summaries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Registered Shops</CardTitle>
            <Store className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalShops}</div>
            <p className="text-xs text-muted-foreground">{stats.activeShops} currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Platform Volume</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">Current calendar month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Onboardings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.newShopsThisWeek}</div>
            <p className="text-xs text-muted-foreground">Shops added this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Platform Exports</CardTitle>
          <CardDescription>Download detailed CSV and PDF reports for bookkeeping and administration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "All Shops Directory", desc: "List of all registered shops with contact details and status." },
              { name: "Monthly Platform Sales", desc: "Aggregated monthly sales and credit overview across all shops." },
              { name: "WhatsApp Notification Logs", desc: "Summary of daily report transmissions and gateway health." },
            ].map((report, idx) => (
              <div key={idx} className="border p-4 rounded-lg flex flex-col gap-3 hover:border-primary transition-colors cursor-pointer group">
                <div>
                  <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">{report.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{report.desc}</p>
                </div>
                <Button variant="outline" className="w-full mt-auto gap-2" onClick={() => handleDownload(report.name)}>
                  <Download className="h-4 w-4" /> Download Export
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
