import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    unit: "kg",
    purchasePrice: "",
    sellingPrice: "",
    minimumStock: "10",
    initialStock: "0"
  });

  const [restockValues, setRestockValues] = useState<Record<string, string>>({});
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const handleRestock = async (productId: string, itemId: string) => {
    const qty = Number(restockValues[itemId]);
    if (!qty || isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive quantity");
      return;
    }

    setRestockingId(itemId);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId,
          quantityChange: qty,
          type: "ADJUSTMENT",
          reason: "Manual Restock"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to restock");
      }

      toast.success("Stock updated successfully");
      
      // Clear input
      const newValues = { ...restockValues };
      delete newValues[itemId];
      setRestockValues(newValues);
      
      // Refresh inventory
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || "Failed to restock");
    } finally {
      setRestockingId(null);
    }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
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

  useEffect(() => {
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

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.category || !newProduct.purchasePrice || !newProduct.sellingPrice) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // 1. Create Product
      const productRes = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newProduct.name,
          category: newProduct.category,
          unit: newProduct.unit,
          purchasePrice: Number(newProduct.purchasePrice),
          sellingPrice: Number(newProduct.sellingPrice),
          minimumStock: Number(newProduct.minimumStock)
        })
      });

      const productData = await productRes.json();
      if (!productRes.ok || !productData.success) {
        throw new Error(productData.message || "Failed to create product");
      }

      const productId = productData.data._id;

      // 2. Add Initial Inventory (even if 0, so it shows up in the list)
      const invRes = await fetch(`${API_BASE_URL}/inventory/adjust`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId,
          quantityChange: Number(newProduct.initialStock),
          type: "ADJUSTMENT",
          reason: "Initial Stock"
        })
      });

      const invData = await invRes.json();
      if (!invRes.ok || !invData.success) {
        throw new Error(invData.message || "Failed to add initial stock");
      }

      toast.success("Product added successfully!");
      setIsAddModalOpen(false);
      setNewProduct({
        name: "",
        category: "",
        unit: "kg",
        purchasePrice: "",
        sellingPrice: "",
        minimumStock: "10",
        initialStock: "0"
      });
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
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
          <Button size="sm" className="gradient-btn shadow-md" onClick={() => setIsAddModalOpen(true)}>
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
                <TableHead className="text-right">Restock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No products match your search." : "No products in inventory. Add products to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item.quantity, item.productId?.minimumStock || 0);
                  const isRestocking = restockingId === item._id;
                  
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.productId?.name || "Unknown"}</TableCell>
                      <TableCell>{item.productId?.category || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.productId?.sellingPrice || 0}</TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            className="w-20 h-8"
                            placeholder="Qty"
                            value={restockValues[item._id] || ""}
                            onChange={(e) => setRestockValues({ ...restockValues, [item._id]: e.target.value })}
                          />
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-8 px-2"
                            onClick={() => handleRestock(item.productId._id, item._id)}
                            disabled={isRestocking || !restockValues[item._id]}
                          >
                            {isRestocking ? "..." : "Save"}
                          </Button>
                        </div>
                      </TableCell>
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

      {/* Add Product Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name *</Label>
              <Input
                id="name"
                className="col-span-3"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category *</Label>
              <Input
                id="category"
                className="col-span-3"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">Unit *</Label>
              <Input
                id="unit"
                className="col-span-3"
                placeholder="kg, ltr, piece"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchase" className="text-right">Buy Price *</Label>
              <Input
                id="purchase"
                type="number"
                className="col-span-3"
                value={newProduct.purchasePrice}
                onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="selling" className="text-right">Sell Price *</Label>
              <Input
                id="selling"
                type="number"
                className="col-span-3"
                value={newProduct.sellingPrice}
                onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minstock" className="text-right">Min Stock</Label>
              <Input
                id="minstock"
                type="number"
                className="col-span-3"
                value={newProduct.minimumStock}
                onChange={(e) => setNewProduct({ ...newProduct, minimumStock: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">Initial Stock</Label>
              <Input
                id="stock"
                type="number"
                className="col-span-3"
                value={newProduct.initialStock}
                onChange={(e) => setNewProduct({ ...newProduct, initialStock: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
