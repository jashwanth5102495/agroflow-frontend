import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserSquare2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Field Agents</h2>
          <p className="text-muted-foreground">
            Manage field agents responsible for onboarding and supporting shops.
          </p>
        </div>
        <Button size="sm" className="gradient-btn shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Add Agent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agents Directory</CardTitle>
          <CardDescription>View all assigned onboarding agents across territories.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <UserSquare2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No field agents configured yet</p>
            <p className="text-sm">Agents added will appear here with their assigned territories and shops.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
