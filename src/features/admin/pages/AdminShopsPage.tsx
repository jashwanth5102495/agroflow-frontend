import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";

interface ShopData {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  email?: string;
  address: string;
  village?: string;
  district: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  owner?: {
    name: string;
    phone: string;
    email?: string;
    lastLoginAt?: string;
  };
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/admin/shops`, { headers });
      const data = await response.json();

      if (response.ok && data.success) {
        setShops(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch shops");
      }
    } catch (err) {
      toast.error("Cannot connect to server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.phone.includes(searchTerm) ||
      shop.district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">{status}</Badge>;
      case "INACTIVE":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">{status}</Badge>;
      case "SUSPENDED":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Registered Shops</h2>
          <p className="text-muted-foreground">
            View and manage all shops registered on the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchShops}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between border-b">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, owner, phone, district..."
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4" />
            <span>{shops.length} total shops</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>District</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No shops match your search." : "No shops registered yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredShops.map((shop) => (
                  <TableRow key={shop._id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>{shop.ownerName}</TableCell>
                    <TableCell>{shop.phone}</TableCell>
                    <TableCell>{shop.district}</TableCell>
                    <TableCell>{shop.state}</TableCell>
                    <TableCell>{getStatusBadge(shop.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(shop.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div>Showing {filteredShops.length} of {shops.length} shops</div>
        </div>
      </div>
    </div>
  );
}
