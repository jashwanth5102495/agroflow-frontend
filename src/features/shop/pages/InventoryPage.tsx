import { useState, useEffect, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  MoreVertical,
  Pencil,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Package
} from "lucide-react";
import { API_BASE_URL, authFetch, getAuthHeaders } from "@/config/api";
import BannerSlideshow from "@/components/BannerSlideshow";
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
    unit?: string;
    sellingPrice: number;
    minimumStock: number;
    status: string;
    description?: string;
  };
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "ALL">(100);

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
    initialStock: "0",
    description: "",
  });

  // Edit Product Name & Details Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{
    _id: string;
    name: string;
    category: string;
    unit: string;
    sellingPrice: number | string;
    minimumStock: number | string;
  } | null>(null);

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
      const res = await authFetch(`${API_BASE_URL}/inventory/adjust`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId,
          quantityChange: qty,
          type: "ADJUSTMENT",
          reason: "Manual Restock",
        }),
      });

      const data = await res.json().catch(() => ({}));
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

  const handleOpenEdit = (item: InventoryItem) => {
    if (!item.productId?._id) return;
    setEditingProduct({
      _id: item.productId._id,
      name: item.productId.name || "",
      category: item.productId.category || "",
      unit: item.productId.unit || "kg",
      sellingPrice: item.productId.sellingPrice ?? "",
      minimumStock: item.productId.minimumStock ?? 10,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;

    const trimmedName = editingProduct.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("Product name must be at least 2 characters");
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload: any = {
        name: trimmedName,
      };
      if (editingProduct.category) payload.category = editingProduct.category.trim();
      if (editingProduct.unit) payload.unit = editingProduct.unit.trim();
      if (editingProduct.sellingPrice !== "") {
        payload.sellingPrice = Number(editingProduct.sellingPrice);
      }
      if (editingProduct.minimumStock !== "") {
        payload.minimumStock = Number(editingProduct.minimumStock);
      }

      const res = await authFetch(`${API_BASE_URL}/products/${editingProduct._id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update product name");
      }

      toast.success(`Product updated: ${trimmedName}`);
      setIsEditModalOpen(false);

      // Update in-place in local state for instantaneous feedback
      setInventory((prev) =>
        prev.map((item) =>
          item.productId?._id === editingProduct._id
            ? {
                ...item,
                productId: {
                  ...item.productId,
                  name: trimmedName,
                  category: payload.category || item.productId.category,
                  unit: payload.unit || item.productId.unit,
                  sellingPrice: payload.sellingPrice ?? item.productId.sellingPrice,
                  minimumStock: payload.minimumStock ?? item.productId.minimumStock,
                },
              }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/products/${productId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Product deleted successfully");
        fetchInventory();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to delete product");
      }
    } catch (err: any) {
      toast.error("Failed to delete product");
    }
  };

  // Fetch full inventory catalog (up to 5000 items so SSB's 509 products all load)
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/inventory?limit=5000`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
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

  // Filter across all products
  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) return inventory;
    const lower = searchTerm.toLowerCase();
    return inventory.filter((item) =>
      item.productId?.name?.toLowerCase().includes(lower) ||
      item.productId?.category?.toLowerCase().includes(lower) ||
      item.productId?.sku?.toLowerCase().includes(lower)
    );
  }, [inventory, searchTerm]);

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // Paginated slice
  const paginatedInventory = useMemo(() => {
    if (pageSize === "ALL") return filteredInventory;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredInventory.slice(startIndex, startIndex + pageSize);
  }, [filteredInventory, currentPage, pageSize]);

  const totalPages = pageSize === "ALL" ? 1 : Math.ceil(filteredInventory.length / pageSize) || 1;

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.category || !newProduct.purchasePrice || !newProduct.sellingPrice) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Product
      const productPayload: any = {
        name: newProduct.name.trim(),
        category: newProduct.category.trim(),
        unit: newProduct.unit.trim(),
        purchasePrice: Number(newProduct.purchasePrice),
        sellingPrice: Number(newProduct.sellingPrice),
        minimumStock: Number(newProduct.minimumStock),
      };
      if (newProduct.description) {
        productPayload.description = newProduct.description.trim();
      }

      const productRes = await authFetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(productPayload),
      });

      const productData = await productRes.json().catch(() => ({}));
      if (!productRes.ok || !productData.success) {
        throw new Error(productData.message || "Failed to create product");
      }

      const productId = productData.data._id;

      // 2. Add Initial Inventory
      const invRes = await authFetch(`${API_BASE_URL}/inventory/adjust`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId,
          quantityChange: Number(newProduct.initialStock) || 0,
          type: "ADJUSTMENT",
          reason: "Initial Stock",
        }),
      });

      const invData = await invRes.json().catch(() => ({}));
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
        initialStock: "0",
        description: "",
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
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground font-medium">Loading full product catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BannerSlideshow />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
            {inventory.length >= 500 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 py-1 font-semibold">
                <PackageCheck className="h-3.5 w-3.5" />
                {inventory.length} Products Loaded
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Manage your full product catalog, edit names, stock levels, and pricing.
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
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search across all ${inventory.length} products...`}
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Page size & filter controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">View:</span>
            <div className="flex items-center border rounded-md overflow-hidden bg-muted/30">
              {([50, 100, 250, "ALL"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    pageSize === size
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {size === "ALL" ? `All (${inventory.length})` : size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[280px]">Product Name (Click ⋮ to Edit)</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    {searchTerm
                      ? `No products match "${searchTerm}".`
                      : "No products in inventory. Add products to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInventory.map((item) => {
                  const status = getStockStatus(item.quantity, item.productId?.minimumStock || 0);
                  const isRestocking = restockingId === item._id;

                  return (
                    <TableRow key={item._id} className="hover:bg-muted/40 transition-colors">
                      {/* Product Name with Three Dots Menu */}
                      <TableCell className="font-medium">
                        <div className="flex items-center justify-between gap-2 group">
                          <span
                            className="font-semibold text-foreground text-sm cursor-pointer hover:text-primary transition-colors line-clamp-2"
                            onClick={() => handleOpenEdit(item)}
                            title="Click to edit product name"
                          >
                            {item.productId?.name || "Unknown"}
                          </span>
                          
                          {/* Three Dots Action Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 opacity-80 group-hover:opacity-100 hover:bg-muted"
                                title="Edit product name or details"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Pencil className="mr-2 h-4 w-4 text-primary" />
                                <span className="font-medium">Edit Product Name</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Edit Price & Stock Alert</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => handleDeleteProduct(item.productId?._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Product</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.productId?.category || "-"}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-right font-medium">
                        <span className="text-sm font-semibold">{item.quantity}</span>
                        <span className="text-xs text-muted-foreground ml-1">{item.productId?.unit || "unit"}</span>
                      </TableCell>
                      
                      <TableCell className="text-right font-medium">
                        ₹{item.productId?.sellingPrice || 0}
                      </TableCell>
                      
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
                            className="h-8 px-2.5 font-medium"
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

        {/* Footer with Counters and Pagination */}
        <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {filteredInventory.length > 0
                ? `${pageSize === "ALL" ? 1 : (currentPage - 1) * pageSize + 1}–${pageSize === "ALL" ? filteredInventory.length : Math.min(currentPage * pageSize, filteredInventory.length)}`
                : 0}
            </span>{" "}
            of <span className="font-medium text-foreground">{filteredInventory.length}</span> products
            {searchTerm && ` (filtered from ${inventory.length} total)`}
          </div>

          {pageSize !== "ALL" && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="text-xs font-semibold px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Product Name & Details Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Product Name & Details
            </DialogTitle>
            <DialogDescription>
              Update the product name or details below. Click save to apply changes.
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="grid gap-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-sm font-semibold">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Enter product name..."
                  className="font-medium text-base"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category" className="text-sm font-semibold">Category</Label>
                  <Input
                    id="edit-category"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="e.g. Fertilizer, Chemical"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit" className="text-sm font-semibold">Unit</Label>
                  <Input
                    id="edit-unit"
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    placeholder="kg, ltr, piece"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-selling-price" className="text-sm font-semibold">Selling Price (₹)</Label>
                  <Input
                    id="edit-selling-price"
                    type="number"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-min-stock" className="text-sm font-semibold">Min Stock Alert</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    value={editingProduct.minimumStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minimumStock: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditProduct} disabled={isSavingEdit} className="gradient-btn shadow-md">
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input
                id="description"
                className="col-span-3"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
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
