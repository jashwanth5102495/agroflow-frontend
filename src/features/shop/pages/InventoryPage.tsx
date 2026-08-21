import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Upload, Plus } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface InventoryItem {
  _id: string;
  quantity: number;
  productId: {
    _id: string;
    name: string;
    category?: string;
    sku?: string;
    sellingPrice: number;
    minimumStock: number;
    status: string;
  };
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/inventory`, { headers });
        const data = await response.json();
        if (response.ok && data.success) {
          setInventory(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch inventory:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const getStockStatus = (quantity: number, minimumStock: number) => {
    if (quantity <= 0) return "Out of Stock";
    if (quantity <= minimumStock * 0.5) return "Critical";
    if (quantity <= minimumStock) return "Low Stock";
    return "In Stock";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Stock":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">{status}</Badge>;
      case "Low Stock":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{status}</Badge>;
      case "Critical":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{status}</Badge>;
      case "Out of Stock":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.productId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your products, stock levels, and pricing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gradient-btn shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between border-b">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" /> Filter Options
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No products match your search." : "No products in inventory. Add products to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item.quantity, item.productId?.minimumStock || 0);
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.productId?.name || "Unknown"}</TableCell>
                      <TableCell>{item.productId?.category || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.productId?.sellingPrice || 0}</TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div>Showing {filteredInventory.length} of {inventory.length} entries</div>
        </div>
      </div>
    </div>
  );
}
