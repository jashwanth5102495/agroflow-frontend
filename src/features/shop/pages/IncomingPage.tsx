import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  Trash2,
  Printer,
  ReceiptText,
  Truck,
  IndianRupee,
  Calendar,
  Building2,
  FileText,
  Package,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncomingItem {
  productId: string;
  name: string;
  packSize?: string;
  unit?: string;
  quantity: number | "";
  purchasePrice: number | "";
  subtotal: number;
}

interface IncomingRecord {
  _id: string;
  companyName: string;
  invoiceNumber: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  gstRate?: number;
  tax: number;
  total: number;
  notes?: string;
  paymentStatus: string;
  items?: any[];
  createdAt: string;
}

export default function IncomingPage() {
  const { shopId } = useParams();
  const [activeTab, setActiveTab] = useState("entry");

  // Inventory products for dropdown selection
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [gstRate, setGstRate] = useState("18"); // default 18% GST
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<IncomingItem[]>([
    { productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [history, setHistory] = useState<IncomingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Print & View Voucher Modal
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // Fetch products for dropdown selection
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory?limit=2000`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        const prods = (data.data || []).map((inv: any) => ({
          _id: inv.productId?._id,
          name: inv.productId?.name,
          unit: inv.productId?.unit || "pcs",
          category: inv.productId?.category,
          sellingPrice: inv.productId?.sellingPrice || 0,
          purchasePrice: inv.productId?.purchasePrice || 0,
        })).filter((p: any) => p._id);
        setAvailableProducts(prods);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch incoming history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/purchases?limit=100`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load incoming history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchHistory();
  }, [shopId]);

  // Handle product selection in item row
  const handleProductSelect = (index: number, prodId: string) => {
    const prod = availableProducts.find(p => p._id === prodId);
    if (!prod) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: prod._id,
      name: prod.name,
      unit: prod.unit || "pcs",
      purchasePrice: prod.purchasePrice || "",
      subtotal: (Number(newItems[index].quantity) || 0) * (Number(prod.purchasePrice) || 0),
    };
    setItems(newItems);
  };

  // Handle field change in item row
  const handleItemChange = (index: number, field: "quantity" | "purchasePrice" | "name" | "unit", val: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: val,
    };

    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].purchasePrice) || 0;
    newItems[index].subtotal = Number((qty * price).toFixed(2));
    setItems(newItems);
  };

  // Add line item
  const addItemRow = () => {
    setItems([...items, { productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }]);
  };

  // Remove line item
  const removeItemRow = (index: number) => {
    if (items.length === 1) {
      setItems([{ productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial calculations
  const rawSubtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const gstPercentage = Number(gstRate) || 0;
  const gstAmount = Number(((rawSubtotal * gstPercentage) / 100).toFixed(2));
  const totalCost = Number((rawSubtotal + gstAmount).toFixed(2));

  // Reset form
  const resetForm = () => {
    setCompanyName("");
    setInvoiceNumber("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setGstRate("18");
    setNotes("");
    setItems([{ productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }]);
  };

  // Submit Incoming Record
  const handleSubmit = async (andPrint = false) => {
    if (!companyName.trim()) {
      toast.error("Please enter the Company / Supplier name.");
      return;
    }

    const validItems = items.filter(
      (it) => it.productId && Number(it.quantity) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one product with quantity greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        invoiceNumber: invoiceNumber.trim() || `INC-${Date.now().toString().slice(-6)}`,
        purchaseDate,
        gstRate: gstPercentage,
        tax: gstAmount,
        total: totalCost,
        notes: notes.trim(),
        items: validItems.map((it) => ({
          productId: it.productId,
          productName: it.name,
          unit: it.unit,
          quantity: Number(it.quantity),
          purchasePrice: Number(it.purchasePrice) || 0,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/purchases`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save incoming material");
      }

      toast.success("Incoming material recorded and stock updated successfully!");

      const savedVoucherData = {
        ...data.data,
        items: validItems,
        shop: JSON.parse(localStorage.getItem("shop") || "{}"),
      };

      if (andPrint) {
        setSelectedVoucher(savedVoucherData);
      }

      resetForm();
      fetchHistory();
      fetchProducts(); // refresh inventory stock
      if (!andPrint) {
        setActiveTab("history");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while saving incoming material");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open voucher modal from history
  const handleViewVoucher = async (record: IncomingRecord) => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/${record._id}`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedVoucher({
          ...data.data.purchase,
          items: data.data.items,
          shop: JSON.parse(localStorage.getItem("shop") || "{}"),
        });
      } else {
        setSelectedVoucher({
          ...record,
          shop: JSON.parse(localStorage.getItem("shop") || "{}"),
        });
      }
    } catch (err) {
      setSelectedVoucher({
        ...record,
        shop: JSON.parse(localStorage.getItem("shop") || "{}"),
      });
    }
  };

  // Filter history
  const filteredHistory = history.filter((rec) => {
    const term = searchTerm.toLowerCase();
    return (
      rec.companyName?.toLowerCase().includes(term) ||
      rec.invoiceNumber?.toLowerCase().includes(term) ||
      rec.notes?.toLowerCase().includes(term) ||
      rec.items?.some((it: any) => it.productName?.toLowerCase().includes(term))
    );
  });

  // History stats
  const totalInwardAmount = history.reduce((sum, h) => sum + (h.total || 0), 0);
  const totalInwardGst = history.reduce((sum, h) => sum + (h.tax || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" /> Incoming Material & Purchases
          </h2>
          <p className="text-muted-foreground">
            Log inward products from companies, update live stock automatically, calculate GST, and maintain incoming history.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Incoming Entry
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> Incoming History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: NEW INCOMING ENTRY */}
        <TabsContent value="entry" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Supplier & Material Inward Details
              </CardTitle>
              <CardDescription>
                Mention company name, invoice or DC number, receiving date, GST, and products received.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="font-semibold text-foreground">
                    Company / Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="companyName"
                      placeholder="e.g. Bayer, UPL, Syngenta, Local Agency"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber" className="font-semibold">
                    Invoice / Challan No.
                  </Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="e.g. INV-98214 (or auto-generated)"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseDate" className="font-semibold">
                    Incoming Date
                  </Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstRate" className="font-semibold">
                    GST Rate (%)
                  </Label>
                  <Select value={gstRate} onValueChange={setGstRate}>
                    <SelectTrigger id="gstRate">
                      <SelectValue placeholder="Select GST %" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Nil / Exempted)</SelectItem>
                      <SelectItem value="5">5% GST</SelectItem>
                      <SelectItem value="12">12% GST</SelectItem>
                      <SelectItem value="18">18% GST (Standard)</SelectItem>
                      <SelectItem value="28">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Incoming Products Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItemRow}
                    className="text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Another Product
                  </Button>
                </div>

                <div className="border rounded-lg overflow-x-auto bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[38%]">Product Name</TableHead>
                        <TableHead className="w-[14%] text-center">Unit</TableHead>
                        <TableHead className="w-[16%] text-center">Quantity Inward</TableHead>
                        <TableHead className="w-[16%] text-right">Unit Cost (₹)</TableHead>
                        <TableHead className="w-[12%] text-right">Subtotal (₹)</TableHead>
                        <TableHead className="w-[4%] text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/20">
                          {/* Product Selection */}
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(val) => handleProductSelect(index, val)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Search or select product..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                {availableProducts.map((p) => (
                                  <SelectItem key={p._id} value={p._id}>
                                    {p.name} {p.category ? `(${p.category})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Unit */}
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {item.unit || "pcs"}
                          </TableCell>

                          {/* Quantity */}
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className="text-center font-medium"
                            />
                          </TableCell>

                          {/* Unit Cost */}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(index, "purchasePrice", e.target.value)}
                              className="text-right font-medium"
                            />
                          </TableCell>

                          {/* Subtotal */}
                          <TableCell className="text-right font-semibold text-foreground">
                            ₹{item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>

                          {/* Remove button */}
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemRow(index)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Bottom Row: Additional Notes & Cost Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-7 space-y-2">
                  <Label htmlFor="notes" className="font-semibold">
                    Additional Notes & Delivery Remarks
                  </Label>
                  <textarea
                    id="notes"
                    rows={4}
                    placeholder="Enter transport / vehicle number, batch / lot details, delivery conditions, or any memo..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="lg:col-span-5 bg-muted/40 p-5 rounded-xl border space-y-3">
                  <h4 className="font-bold text-base text-foreground border-b pb-2">Cost & GST Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Cost:</span>
                    <span className="font-medium">₹{rawSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({gstPercentage}%):</span>
                    <span className="font-medium">₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center text-lg font-bold text-emerald-600">
                    <span>Total Cost of Material:</span>
                    <span>₹{totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <Printer className="h-4 w-4 mr-2" /> Save & Print Voucher
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Saving..." : "Save Incoming"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INCOMING HISTORY */}
        <TabsContent value="history" className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Inward Shipments</p>
                  <p className="text-2xl font-bold">{history.length}</p>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Truck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Material Inward Cost</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ₹{totalInwardAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Input GST Paid</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{totalInwardGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-primary">
                  <ReceiptText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Search & Table */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, invoice #, product, or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-muted/50"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory}>
                Refresh History
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Company / Supplier</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Items Received</TableHead>
                    <TableHead className="text-right">GST (₹)</TableHead>
                    <TableHead className="text-right">Total Cost (₹)</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Loading incoming history...
                      </TableCell>
                    </TableRow>
                  ) : filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No incoming records matching your search." : "No incoming material logged yet. Click 'New Incoming Entry' above."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((rec) => (
                      <TableRow key={rec._id} className="hover:bg-muted/30">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(rec.purchaseDate || rec.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {rec.companyName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rec.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {rec.items?.length || 1} product(s)
                          </span>
                          {rec.items && rec.items.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {rec.items.map((it: any) => it.productName || it.name).filter(Boolean).join(", ")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ₹{(rec.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 whitespace-nowrap">
                          ₹{(rec.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {rec.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVoucher(rec)}
                            title="Print / View Inward Voucher"
                            className="text-primary hover:bg-primary/10"
                          >
                            <Printer className="h-4 w-4 mr-1" /> Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PRINTABLE INWARD VOUCHER MODAL */}
      <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="print:hidden">
            <DialogTitle>Goods Receipt Note / Inward Voucher</DialogTitle>
          </DialogHeader>

          {selectedVoucher && (
            <div id="print-incoming-voucher" className="p-4 bg-white text-black font-sans text-xs border rounded-lg">
              {/* Header */}
              <div className="text-center space-y-1 border-b pb-3">
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  {selectedVoucher.shop?.name || "AGROFLOW STORE"}
                </h2>
                <p className="text-gray-600">
                  {selectedVoucher.shop?.address || "Agricultural Supplies & Solutions"}
                </p>
                <p className="text-gray-600">
                  Phone: {selectedVoucher.shop?.phone || "N/A"}
                  {selectedVoucher.shop?.gstNumber && ` | GSTIN: ${selectedVoucher.shop.gstNumber}`}
                </p>
                <div className="pt-2">
                  <span className="inline-block bg-gray-100 border px-3 py-1 font-bold text-sm tracking-wide uppercase rounded">
                    GOODS RECEIPT NOTE (INCOMING MATERIAL)
                  </span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 py-3 border-b text-xs">
                <div>
                  <p><span className="font-semibold text-gray-700">Supplier / Company:</span> <span className="font-bold text-sm">{selectedVoucher.companyName}</span></p>
                  <p><span className="font-semibold text-gray-700">Invoice / Challan No:</span> {selectedVoucher.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p>
                    <span className="font-semibold text-gray-700">Date:</span>{" "}
                    {new Date(selectedVoucher.purchaseDate || selectedVoucher.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p><span className="font-semibold text-gray-700">Voucher Ref:</span> #{selectedVoucher._id?.slice(-8).toUpperCase()}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full my-3 border-collapse text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-700">
                    <th className="py-1.5 px-1 font-bold">#</th>
                    <th className="py-1.5 px-1 font-bold">Product Name</th>
                    <th className="py-1.5 px-1 text-center font-bold">Unit</th>
                    <th className="py-1.5 px-1 text-center font-bold">Qty</th>
                    <th className="py-1.5 px-1 text-right font-bold">Cost (₹)</th>
                    <th className="py-1.5 px-1 text-right font-bold">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedVoucher.items || []).map((it: any, i: number) => {
                    const itemName = it.productName || it.name || it.productId?.name || "Product";
                    const itemQty = it.quantity;
                    const itemPrice = it.purchasePrice || 0;
                    const itemTotal = it.subtotal || itemQty * itemPrice;
                    return (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="py-1.5 px-1">{i + 1}</td>
                        <td className="py-1.5 px-1 font-medium">{itemName}</td>
                        <td className="py-1.5 px-1 text-center">{it.unit || "pcs"}</td>
                        <td className="py-1.5 px-1 text-center font-bold">{itemQty}</td>
                        <td className="py-1.5 px-1 text-right">₹{Number(itemPrice).toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-right font-bold">₹{Number(itemTotal).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="border-t pt-2 space-y-1 text-right text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Material Subtotal:</span>
                  <span className="font-semibold">₹{(selectedVoucher.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedVoucher.gstRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Input GST ({selectedVoucher.gstRate}%):</span>
                    <span className="font-semibold">₹{(selectedVoucher.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-b py-1.5 mt-1">
                  <span>Total Incoming Cost:</span>
                  <span>₹{(selectedVoucher.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedVoucher.notes && (
                <div className="mt-3 p-2 bg-gray-50 border rounded text-xs">
                  <p className="font-semibold text-gray-700">Remarks / Memo:</p>
                  <p className="text-gray-600">{selectedVoucher.notes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="mt-8 pt-4 border-t flex justify-between text-xs text-gray-600">
                <div>
                  <p className="border-t border-gray-400 pt-1 mt-6 w-36 text-center font-medium">Store Incharge Signature</p>
                </div>
                <div>
                  <p className="border-t border-gray-400 pt-1 mt-6 w-36 text-center font-medium">Received By Signature</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
              <Printer className="w-4 h-4 mr-2" /> Print Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
