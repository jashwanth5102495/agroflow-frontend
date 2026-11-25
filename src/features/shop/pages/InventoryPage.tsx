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
  Package,
  TrendingUp,
  TrendingDown,
  Boxes,
  IndianRupee
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
import { formatProductName } from "@/lib/utils";

interface InventoryItem {
  _id: string;
  quantity: number;
  productId: {
    _id: string;
    name: string;
    category?: string;
    sku?: string;
    unit?: string;
    purchasePrice?: number;
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
    unit: "pcs",
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
    purchasePrice: number | string;
    sellingPrice: number | string;
    minimumStock: number | string;
  } | null>(null);

  const [restockValues, setRestockValues] = useState<Record<string, string>>({});
  const [restockingId, setRestockingId] = useState<string | null>(null);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
      name: formatProductName(item.productId.name || ""),
      category: item.productId.category || "",
      unit: item.productId.unit && !["kg", "gm", "g", "ml", "L", "ltr"].includes(item.productId.unit) ? item.productId.unit : "pcs",
      purchasePrice: item.productId.purchasePrice ?? "",
      sellingPrice: item.productId.sellingPrice ?? "",
      minimumStock: item.productId.minimumStock ?? 10,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;

    const trimmedName = editingProduct.name.trim().toUpperCase();
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
      if (editingProduct.purchasePrice !== "") {
        payload.purchasePrice = Number(editingProduct.purchasePrice);
      }
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
                  purchasePrice: payload.purchasePrice !== undefined ? payload.purchasePrice : item.productId.purchasePrice,
                  sellingPrice: payload.sellingPrice !== undefined ? payload.sellingPrice : item.productId.sellingPrice,
                  minimumStock: payload.minimumStock !== undefined ? payload.minimumStock : item.productId.minimumStock,
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
    return inventory.filter((item) => {
      const name = item.productId?.name || "";
      const formatted = formatProductName(name);
      return (
        name.toLowerCase().includes(lower) ||
        formatted.toLowerCase().includes(lower) ||
        item.productId?.category?.toLowerCase().includes(lower) ||
        item.productId?.sku?.toLowerCase().includes(lower)
      );
    });
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

  // Full Inventory Financials & Profit Tracking
  const totalStockCount = useMemo(
    () => inventory.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
    [inventory]
  );
  const totalInventoryCost = useMemo(
    () =>
      inventory.reduce(
        (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.productId?.purchasePrice) || 0),
        0
      ),
    [inventory]
  );
  const totalInventoryRetail = useMemo(
    () =>
      inventory.reduce(
        (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.productId?.sellingPrice) || 0),
        0
      ),
    [inventory]
  );
  const totalEstimatedProfit = Math.max(0, totalInventoryRetail - totalInventoryCost);
  const overallMarginPct =
    totalInventoryRetail > 0 ? ((totalEstimatedProfit / totalInventoryRetail) * 100).toFixed(1) : "0";

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.name.trim()) {
      toast.error("Please enter a product name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const productPayload: any = {
        name: newProduct.name.trim().toUpperCase(),
        category: newProduct.category?.trim() || "General",
        unit: newProduct.unit?.trim() || "pcs",
        purchasePrice: Number(newProduct.purchasePrice) || 0,
        sellingPrice: Number(newProduct.sellingPrice) || 0,
        minimumStock: Number(newProduct.minimumStock) || 10,
        initialStock: Number(newProduct.initialStock) || 0,
      };
      if (newProduct.description?.trim()) {
        productPayload.description = newProduct.description.trim();
      }

      // Single atomic backend call to create product & initialize inventory
      const productRes = await authFetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(productPayload),
      });

      const productData = await productRes.json().catch(() => ({}));
      if (!productRes.ok || !productData.success) {
        throw new Error(productData.message || "Failed to create product");
      }

      toast.success("Product added successfully!");
      setIsAddModalOpen(false);
      setNewProduct({
        name: "",
        category: "",
        unit: "pcs",
        purchasePrice: "",
        sellingPrice: "",
        minimumStock: "10",
        initialStock: "0",
        description: "",
      });
      await fetchInventory();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export full/filtered inventory to CSV
  const handleExportCSV = () => {
    const exportItems = filteredInventory.length > 0 ? filteredInventory : inventory;
    if (exportItems.length === 0) {
      toast.error("No products available to export.");
      return;
    }

    const headers = [
      "Product Name",
      "Category",
      "SKU",
      "Unit",
      "Purchase Price",
      "Selling Price",
      "Profit Per Unit",
      "Margin (%)",
      "Current Stock",
      "Minimum Stock",
      "Status",
      "Description",
    ];

    const csvRows = [headers.join(",")];

    exportItems.forEach((item) => {
      const p = item.productId || ({} as any);
      const status = getStockStatus(item.quantity, p.minimumStock || 10);
      const buy = p.purchasePrice || 0;
      const sell = p.sellingPrice || 0;
      const profit = sell - buy;
      const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : "0";
      const row = [
        `"${(formatProductName(p.name) || "").replace(/"/g, '""')}"`,
        `"${(p.category || "").replace(/"/g, '""')}"`,
        `"${(p.sku || "").replace(/"/g, '""')}"`,
        `"${((() => { const u = (p.unit || '').toLowerCase(); return !u || ['kg', 'gm', 'g', 'ml', 'l', 'ltr', 'liter', 'litre', 'unit'].includes(u) ? 'pcs' : (p.unit || 'pcs'); })()).replace(/"/g, '""')}"`,
        buy,
        sell,
        profit,
        margin,
        item.quantity || 0,
        p.minimumStock || 10,
        `"${status}"`,
        `"${(p.description || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AgroFlow_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${exportItems.length} products to CSV!`);
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      "Name",
      "Category",
      "Unit",
      "PurchasePrice",
      "SellingPrice",
      "Stock",
      "MinimumStock",
      "Description",
    ];
    const sampleRows = [
      templateHeaders.join(","),
      '"DAP Fertilizer","Fertilizers","bag",1250,1350,50,10,"High quality DAP 50kg bag"',
      '"Neem Coated Urea","Fertilizers","bag",266,270,100,20,"IFFCO Neem Coated Urea 45kg"',
      '"Chlorpyrifos 20% EC","Pesticides","L",380,450,25,5,"Insecticide 1 Litre bottle"',
      '"NPK 19:19:19 1kg","Fertilizers","kg",110,140,40,10,"100% Water Soluble Fertilizer"',
    ];

    const blob = new Blob(["\uFEFF" + sampleRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "agroflow_product_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Sample CSV template downloaded!");
  };

  // Robust CSV parser
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file must have a header row and at least one data row.");
    }

    const parseRow = (rowStr: string) => {
      const result: string[] = [];
      let insideQuotes = false;
      let entry = "";
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          if (insideQuotes && rowStr[i + 1] === '"') {
            entry += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === "," && !insideQuotes) {
          result.push(entry.trim());
          entry = "";
        } else {
          entry += char;
        }
      }
      result.push(entry.trim());
      return result;
    };

    const rawHeaders = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

    const nameIdx = rawHeaders.findIndex((h) => h.includes("name") || h.includes("product") || h.includes("item"));
    const catIdx = rawHeaders.findIndex((h) => h.includes("cat") || h.includes("type") || h.includes("group"));
    const unitIdx = rawHeaders.findIndex((h) => h.includes("unit") || h.includes("uom") || h.includes("measure"));
    const buyIdx = rawHeaders.findIndex((h) => h.includes("purchase") || h.includes("buy") || h.includes("cost"));
    const sellIdx = rawHeaders.findIndex((h) => h.includes("sell") || h.includes("price") || h.includes("rate") || h.includes("mrp"));
    const stockIdx = rawHeaders.findIndex((h) => h.includes("stock") || h.includes("qty") || h.includes("quantity"));
    const minIdx = rawHeaders.findIndex((h) => h.includes("min") || h.includes("reorder") || h.includes("alert"));
    const descIdx = rawHeaders.findIndex((h) => h.includes("desc") || h.includes("detail") || h.includes("note"));

    if (nameIdx === -1) {
      throw new Error("Could not find a 'Name' or 'Product Name' column in the CSV.");
    }

    const products: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseRow(lines[i]);
      const name = row[nameIdx]?.trim();
      if (!name || name.length < 2) continue;

      const category = catIdx !== -1 && row[catIdx] ? row[catIdx].trim() : "General";
      const rawUnit = unitIdx !== -1 && row[unitIdx] ? row[unitIdx].trim() : "pcs";
      const unit = !rawUnit || ["kg", "gm", "g", "ml", "l", "ltr", "liter", "litre", "unit"].includes(rawUnit.toLowerCase()) ? "pcs" : rawUnit;
      const purchasePrice = buyIdx !== -1 && !isNaN(Number(row[buyIdx])) ? Number(row[buyIdx]) : 0;
      const sellingPrice = sellIdx !== -1 && !isNaN(Number(row[sellIdx])) ? Number(row[sellIdx]) : (purchasePrice > 0 ? purchasePrice : 0);
      const stock = stockIdx !== -1 && !isNaN(Number(row[stockIdx])) ? Number(row[stockIdx]) : 0;
      const minimumStock = minIdx !== -1 && !isNaN(Number(row[minIdx])) ? Number(row[minIdx]) : 10;
      const description = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : "";

      products.push({
        name,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        stock,
        minimumStock,
        description,
      });
    }

    return products;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const products = parseCSV(text);
        if (products.length === 0) {
          setImportError("No valid products found in the file. Please check column headers.");
          setParsedProducts([]);
        } else {
          setParsedProducts(products);
        }
      } catch (err: any) {
        setImportError(err.message || "Failed to parse CSV file.");
        setParsedProducts([]);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedProducts.length === 0) {
      toast.error("No valid products to import.");
      return;
    }

    setIsImporting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/products/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ items: parsedProducts }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`Successfully imported ${data.data?.importedCount || parsedProducts.length} products!`);
        setIsImportModalOpen(false);
        setParsedProducts([]);
        setImportFile(null);
        await fetchInventory();
      } else {
        throw new Error(data.message || "Bulk import failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import products");
    } finally {
      setIsImporting(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-medium"
          >
            <Upload className="mr-1.5 h-4 w-4 text-emerald-600" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-blue-200 text-blue-800 hover:bg-blue-50 font-medium"
          >
            <Download className="mr-1.5 h-4 w-4 text-blue-600" /> Export
          </Button>
          <Button size="sm" className="gradient-btn shadow-md font-medium" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Inventory Financial & Profit Tracking Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Products</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-foreground">{inventory.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Catalog items active</p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Current Stock</span>
            <Boxes className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-indigo-600">{totalStockCount.toLocaleString("en-IN")} pcs</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total pieces in warehouse</p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Purchase Value (Cost)</span>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-600">
              ₹{totalInventoryCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total purchase capital in stock</p>
          </div>
        </div>

        <div className="bg-card border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Expected Total Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-600">
              ₹{totalEstimatedProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.2 rounded">
                +{overallMarginPct}% margin
              </span>
              <span>· Retail: ₹{totalInventoryRetail.toLocaleString("en-IN")}</span>
            </div>
          </div>
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
                <TableHead className="text-right whitespace-nowrap">Stock (Pcs)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Purchase Price (₹)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Selling Price (₹)</TableHead>
                <TableHead className="text-right whitespace-nowrap">Profit Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Restock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
                            className="font-semibold text-foreground text-sm cursor-pointer hover:text-primary transition-colors line-clamp-2 uppercase"
                            onClick={() => handleOpenEdit(item)}
                            title="Click to edit product name"
                          >
                            {formatProductName(item.productId?.name) || "Unknown"}
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
                                <span>Edit Prices & Stock Alert</span>
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
                        <span className="text-xs text-muted-foreground ml-1">
                          {(() => {
                            const u = (item.productId?.unit || "").toLowerCase();
                            if (!u || ["kg", "gm", "g", "ml", "l", "ltr", "liter", "litre", "unit"].includes(u)) {
                              return "pcs";
                            }
                            return item.productId?.unit || "pcs";
                          })()}
                        </span>
                      </TableCell>
                      
                      {/* Purchase Price */}
                      <TableCell className="text-right font-medium text-muted-foreground">
                        ₹{item.productId?.purchasePrice ?? 0}
                      </TableCell>

                      {/* Selling Price */}
                      <TableCell className="text-right font-semibold text-foreground">
                        ₹{item.productId?.sellingPrice ?? 0}
                      </TableCell>

                      {/* Profit Margin */}
                      <TableCell className="text-right font-medium">
                        {(() => {
                          const sell = item.productId?.sellingPrice ?? 0;
                          const buy = item.productId?.purchasePrice ?? 0;
                          const profit = sell - buy;
                          const marginPct = sell > 0 ? ((profit / sell) * 100).toFixed(0) : "0";
                          if (profit > 0) {
                            return (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                +₹{profit} ({marginPct}%)
                              </span>
                            );
                          } else if (profit === 0) {
                            return <span className="text-xs text-muted-foreground">₹0</span>;
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1 text-destructive font-semibold text-xs bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                                -₹{Math.abs(profit)}
                              </span>
                            );
                          }
                        })()}
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
                    placeholder="pcs, packet, bottle, box"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-purchase-price" className="text-sm font-semibold">Purchase Price (₹)</Label>
                  <Input
                    id="edit-purchase-price"
                    type="number"
                    value={editingProduct.purchasePrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, purchasePrice: e.target.value })}
                    placeholder="Cost price"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-selling-price" className="text-sm font-semibold">Selling Price (₹)</Label>
                  <Input
                    id="edit-selling-price"
                    type="number"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: e.target.value })}
                    placeholder="Selling price"
                  />
                </div>
              </div>

              {/* Profit Preview in Edit Modal */}
              {Number(editingProduct.sellingPrice) > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium">Estimated Profit / Margin:</span>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                    +₹{(Number(editingProduct.sellingPrice) - (Number(editingProduct.purchasePrice) || 0)).toFixed(2)}/pc
                    {Number(editingProduct.purchasePrice) > 0 && (
                      <span className="ml-1 text-[11px] opacity-80">
                        ({(((Number(editingProduct.sellingPrice) - Number(editingProduct.purchasePrice)) / Number(editingProduct.sellingPrice)) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                placeholder="pcs, packet, bottle, box"
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
            {Number(newProduct.sellingPrice) > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-xs text-muted-foreground font-medium">Margin</span>
                <div className="col-span-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2 rounded text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  +₹{(Number(newProduct.sellingPrice) - (Number(newProduct.purchasePrice) || 0)).toFixed(2)}/pc
                  {Number(newProduct.purchasePrice) > 0 && (
                    <span className="ml-1 opacity-80">
                      ({(((Number(newProduct.sellingPrice) - Number(newProduct.purchasePrice)) / Number(newProduct.sellingPrice)) * 100).toFixed(1)}% margin)
                    </span>
                  )}
                </div>
              </div>
            )}
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

      {/* Import Products from CSV Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5 text-emerald-600" />
              Import Products from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file containing your product catalog. Columns are automatically mapped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1: Template download */}
            <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-lg border border-dashed text-xs sm:text-sm">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Need a starting template?</p>
                <p className="text-muted-foreground text-xs">Download our standard CSV format with sample rows.</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" /> Sample Template
              </Button>
            </div>

            {/* Step 2: File input */}
            <div className="space-y-2">
              <Label htmlFor="csv-file" className="text-sm font-semibold">Select CSV File</Label>
              <div className="border-2 border-dashed rounded-lg p-5 text-center hover:bg-muted/30 transition-colors cursor-pointer relative">
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFileUpload}
                />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {importFile ? importFile.name : "Click or drag & drop CSV file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported format: .csv with columns Name, Category, Unit, PurchasePrice, SellingPrice, Stock
                </p>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
                {importError}
              </div>
            )}

            {/* Step 3: Parsed preview */}
            {parsedProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Parsed Preview
                  </span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-semibold text-xs">
                    {parsedProducts.length} Products Found
                  </Badge>
                </div>
                
                <div className="border rounded-md max-h-48 overflow-y-auto text-xs">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="py-1 px-2 text-xs">#</TableHead>
                        <TableHead className="py-1 px-2 text-xs">Name</TableHead>
                        <TableHead className="py-1 px-2 text-xs">Category</TableHead>
                        <TableHead className="py-1 px-2 text-xs text-right">Cost</TableHead>
                        <TableHead className="py-1 px-2 text-xs text-right">Sell</TableHead>
                        <TableHead className="py-1 px-2 text-xs text-center">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedProducts.slice(0, 5).map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-1.5 px-2 font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="py-1.5 px-2 font-medium max-w-[150px] truncate">{p.name}</TableCell>
                          <TableCell className="py-1.5 px-2 text-muted-foreground">{p.category}</TableCell>
                          <TableCell className="py-1.5 px-2 text-right">₹{p.purchasePrice}</TableCell>
                          <TableCell className="py-1.5 px-2 text-right font-medium">₹{p.sellingPrice}</TableCell>
                          <TableCell className="py-1.5 px-2 text-center font-bold text-emerald-700">{p.stock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedProducts.length > 5 && (
                  <p className="text-[11px] text-muted-foreground text-center italic">
                    Showing first 5 of {parsedProducts.length} products to be imported.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportModalOpen(false);
                setParsedProducts([]);
                setImportFile(null);
                setImportError(null);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteImport}
              disabled={isImporting || parsedProducts.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isImporting ? "Importing..." : `Import ${parsedProducts.length > 0 ? parsedProducts.length : ""} Products`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
