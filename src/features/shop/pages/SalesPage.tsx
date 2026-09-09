import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, ReceiptText, Info, Copy, Link as LinkIcon } from "lucide-react";
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

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  category?: string;
  description?: string;
  stock?: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  total: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState("walkin");
  
  // Info Modal
  const [infoProduct, setInfoProduct] = useState<Product | null>(null);

  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [downPayment, setDownPayment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Cashier Mode
  const [isCashierMode, setIsCashierMode] = useState(false);
  const [cashierUrl, setCashierUrl] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, farmersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/inventory?limit=1000`, { headers: getHeaders() }),
          fetch(`${API_BASE_URL}/farmers`, { headers: getHeaders() }),
        ]);
        const inventoryData = await inventoryRes.json();
        const farmersData = await farmersRes.json();

        if (inventoryRes.ok && inventoryData.success) {
          const mappedProducts = inventoryData.data.map((item: any) => ({
            ...item.productId,
            stock: item.quantity
          }));
          setProducts(mappedProducts || []);
        }
        if (farmersRes.ok && farmersData.success) {
          setFarmers(farmersData.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // Init Cashier Mode state
    const shopData = localStorage.getItem("shop");
    if (shopData) {
      const shop = JSON.parse(shopData);
      if (shop.isCashierEnabled && shop.cashierToken) {
        setIsCashierMode(true);
        setCashierUrl(`${window.location.origin}/cashier/auth/${shop._id}/${shop.cashierToken}`);
      }
    }
  }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product._id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product._id
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
            : item
        )
      );
    } else {
      setCart([...cart, { productId: product._id, name: product.name, price: product.sellingPrice, qty: 1, total: product.sellingPrice }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    
    // Default down payment to full total for Cash
    setDownPayment(grandTotal.toString());
    setPaymentMethod("CASH");
    if (selectedFarmer !== "walkin") {
      const f = farmers.find(f => f._id === selectedFarmer);
      if (f) {
        setCustomerName(f.name);
        setCustomerPhone(f.phone || "");
      }
    } else {
      setCustomerName("");
      setCustomerPhone("");
    }
    setIsCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (selectedFarmer === "walkin" && paymentMethod === "CREDIT") {
      toast.error("Walk-in customers cannot be given credit. Please register the farmer first.");
      return;
    }
    if (selectedFarmer === "walkin" && !customerName.trim()) {
      toast.error("Please enter a customer name for walk-in billing.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPaymentMethod = paymentMethod;
      const amtPaid = Number(downPayment) || 0;

      if (paymentMethod === "CREDIT" && amtPaid > 0 && amtPaid < grandTotal) {
        finalPaymentMethod = "PARTIAL";
      } else if (paymentMethod === "CREDIT" && amtPaid >= grandTotal) {
        finalPaymentMethod = "CASH";
      }

      const payload = {
        farmerId: selectedFarmer === "walkin" ? undefined : selectedFarmer, 
        customerName: selectedFarmer === "walkin" ? customerName : undefined,
        customerPhone: selectedFarmer === "walkin" ? customerPhone : undefined,
        invoiceNumber: `INV-${Date.now()}`,
        paymentMethod: finalPaymentMethod,
        amountPaid: amtPaid,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.qty,
          discount: 0
        }))
      };

      const res = await fetch(`${API_BASE_URL}/sales`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Invoice generated successfully!");
        setCompletedSale({
          ...data.data,
          cartItems: cart, // Save cart details for receipt
          paymentMethod: finalPaymentMethod,
          downPayment: amtPaid
        });
        setCart([]);
        setIsCheckoutOpen(false);
      } else {
        throw new Error(data.message || "Failed to generate invoice");
      }
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

  const handleToggleCashierMode = async () => {
    try {
      const newState = !isCashierMode;
      const res = await fetch(`${API_BASE_URL}/auth/cashier/toggle`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: newState }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setIsCashierMode(newState);
        
        const shopData = localStorage.getItem("shop");
        if (shopData) {
          const shop = JSON.parse(shopData);
          shop.isCashierEnabled = newState;
          shop.cashierToken = data.data.cashierToken;
          localStorage.setItem("shop", JSON.stringify(shop));
          
          if (newState) {
            setCashierUrl(`${window.location.origin}/cashier/auth/${shop._id}/${data.data.cashierToken}`);
            toast.success("Cashier Mode enabled");
          } else {
            setCashierUrl("");
            toast.success("Cashier Mode disabled");
          }
        }
      } else {
        toast.error(data.message || "Failed to toggle Cashier Mode");
      }
    } catch (err) {
      toast.error("Failed to connect to server");
    }
  };

  const copyCashierUrl = () => {
    navigator.clipboard.writeText(cashierUrl);
    toast.success("Cashier link copied to clipboard!");
  };

  // Check if current user is cashier
  const userData = localStorage.getItem("user");
  const isCashier = userData ? JSON.parse(userData).role === "CASHIER" : false;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Point of Sale</h2>
          <p className="text-muted-foreground">
            Create new sales invoices and process payments.
          </p>
        </div>
        
        {!isCashier && (
          <div className="flex flex-col gap-2 p-3 bg-muted/20 border rounded-lg w-full sm:w-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cashier Desk Link</span>
              </div>
              
              {/* Custom Tailwind Toggle */}
              <button 
                type="button"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isCashierMode ? 'bg-primary' : 'bg-input'}`}
                role="switch"
                aria-checked={isCashierMode}
                onClick={handleToggleCashierMode}
              >
                <span className="sr-only">Toggle Cashier Mode</span>
                <span 
                  aria-hidden="true" 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${isCashierMode ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
            {isCashierMode && cashierUrl && (
              <div className="flex items-center gap-2">
                <Input value={cashierUrl} readOnly className="h-8 text-xs w-full sm:w-64" />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyCashierUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Products</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9 bg-muted/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[500px]">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {searchTerm ? "No products match your search." : "No products available. Add products in Inventory first."}
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    className="border rounded-lg p-3 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card flex flex-col justify-between h-28 relative group"
                    onClick={() => addToCart(product)}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm line-clamp-2 pr-6">{product.name}</h4>
                        {product.description && (
                          <div 
                            className="absolute top-2 right-2 text-muted-foreground hover:text-primary z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoProduct(product);
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{product.category || ""}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <span className="font-semibold text-primary">₹{product.sellingPrice}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">Stock: {product.stock || 0}</div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary hover:text-white"
                        disabled={(product.stock || 0) <= 0}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle>Current Sale</CardTitle>
              <div className="mt-4 space-y-2">
                <Label>Select Farmer</Label>
                <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in Customer</SelectItem>
                    {farmers.map((f: any) => (
                      <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center w-16">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Click products to add them to the cart
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium text-sm py-3">
                          {item.name}
                          <div className="text-xs text-muted-foreground">₹{item.price}/unit</div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{item.qty}</TableCell>
                        <TableCell className="text-right font-medium py-3">₹{item.total}</TableCell>
                        <TableCell className="py-3 px-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex flex-col border-t bg-muted/10 pt-4 gap-4">
              <div className="w-full space-y-1">
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <Button className="w-full gradient-btn shadow-md py-6 text-lg mt-2" disabled={cart.length === 0} onClick={handleOpenCheckout}>
                <ReceiptText className="mr-2 h-5 w-5" /> Generate Invoice
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={!!infoProduct} onOpenChange={() => setInfoProduct(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{infoProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{infoProduct?.description}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoProduct(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>
              Review payment details before generating invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
              <h4 className="font-semibold text-sm flex items-center justify-between">
                Customer Details
                {selectedFarmer !== "walkin" && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Registered Farmer</span>
                )}
              </h4>
              <div className="grid gap-2 relative">
                <Label htmlFor="customerName">Name *</Label>
                <Input 
                  id="customerName" 
                  autoComplete="off"
                  placeholder="Enter name to search farmers or add new" 
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (selectedFarmer !== "walkin") {
                      setSelectedFarmer("walkin");
                    }
                  }}
                />
                {customerName.length > 0 && selectedFarmer === "walkin" && (
                  <div className="absolute top-[100%] left-0 w-full z-50 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {farmers
                      .filter(f => f.name.toLowerCase().includes(customerName.toLowerCase()) || (f.phone && f.phone.includes(customerName)))
                      .map(f => (
                        <div 
                          key={f._id}
                          className="px-3 py-2 cursor-pointer hover:bg-muted text-sm border-b last:border-0"
                          onClick={() => {
                            setCustomerName(f.name);
                            setCustomerPhone(f.phone || "");
                            setSelectedFarmer(f._id);
                          }}
                        >
                          <div className="font-medium">{f.name}</div>
                          {f.phone && <div className="text-xs text-muted-foreground">{f.phone}</div>}
                        </div>
                      ))}
                    {farmers.filter(f => f.name.toLowerCase().includes(customerName.toLowerCase()) || (f.phone && f.phone.includes(customerName))).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground italic">No registered farmers found. Will bill as walk-in.</div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerPhone">Phone (Optional)</Label>
                <Input 
                  id="customerPhone" 
                  placeholder="Enter phone number" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-bold bg-muted/30 p-3 rounded-lg border">
              <span>Grand Total</span>
              <span className="text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button" 
                  variant={paymentMethod === "CASH" ? "default" : "outline"} 
                  onClick={() => { setPaymentMethod("CASH"); setDownPayment(grandTotal.toString()); }}
                >
                  Cash
                </Button>
                <Button 
                  type="button" 
                  variant={paymentMethod === "CREDIT" ? "default" : "outline"}
                  onClick={() => { setPaymentMethod("CREDIT"); setDownPayment("0"); }}
                >
                  Credit
                </Button>
              </div>
            </div>

            {paymentMethod === "CREDIT" && (
              <div className="space-y-4 pt-2 border-t">
                {selectedFarmer === "walkin" && (
                  <div className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">
                    Warning: Walk-in customers cannot take credit. Please select a registered farmer.
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Down Payment (Amount Paid)</Label>
                  <Input 
                    type="number" 
                    value={downPayment} 
                    onChange={(e) => setDownPayment(e.target.value)} 
                    max={grandTotal}
                    min={0}
                  />
                </div>
                
                <div className="flex justify-between items-center text-sm p-3 bg-warning/10 text-warning-foreground rounded-lg border border-warning/20">
                  <span className="font-medium">Credit Amount to Ledger:</span>
                  <span className="font-bold">
                    ₹{Math.max(0, grandTotal - (Number(downPayment) || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
            
            {paymentMethod === "CASH" && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Amount Collected</Label>
                <Input 
                  type="number" 
                  value={downPayment} 
                  onChange={(e) => setDownPayment(e.target.value)} 
                />
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={isSubmitting || (paymentMethod === "CREDIT" && selectedFarmer === "walkin")}>
              {isSubmitting ? "Processing..." : "Confirm & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Modal */}
      <Dialog open={!!completedSale} onOpenChange={(open) => !open && setCompletedSale(null)}>
        <DialogContent className="sm:max-w-[400px] print:w-full print:max-w-full print:p-0 print:border-none print:shadow-none bg-white">
          <DialogHeader className="print:hidden">
            <DialogTitle>Invoice Generated</DialogTitle>
            <DialogDescription>
              Review the invoice and print it for the customer.
            </DialogDescription>
          </DialogHeader>
          
          {completedSale && (
            <div id="printable-receipt" className="p-2 space-y-3 text-sm font-mono text-black bg-white print:p-0 print:text-xs">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold uppercase">{completedSale.shop?.name || "AgriFlow Shop"}</h2>
                <p>{completedSale.shop?.address}</p>
                <p>Ph: {completedSale.shop?.phone}</p>
                <div className="border-b border-dashed my-2 border-gray-400"></div>
                <h3 className="font-bold text-lg">TAX INVOICE</h3>
                <div className="text-left mt-2 space-y-0.5">
                  <p>Inv No: {completedSale.invoiceNumber || completedSale._id?.slice(-6).toUpperCase()}</p>
                  <p>Date: {new Date(completedSale.createdAt || Date.now()).toLocaleString('en-IN')}</p>
                  <p>
                    Customer: {completedSale.customerName || (selectedFarmer !== 'walkin' ? farmers.find(f => f._id === selectedFarmer)?.name : 'Walk-in')}
                  </p>
                </div>
                <div className="border-b border-dashed my-2 border-gray-400"></div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dashed border-gray-400">
                    <th className="py-1 w-1/2">Item</th>
                    <th className="py-1 text-center w-1/6">Qty</th>
                    <th className="py-1 text-right w-1/6">Price</th>
                    <th className="py-1 text-right w-1/6">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.cartItems?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1 pr-1 break-words">{item.name}</td>
                      <td className="py-1 text-center">{item.qty}</td>
                      <td className="py-1 text-right">{item.price}</td>
                      <td className="py-1 text-right">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 pt-2 mt-2 space-y-1 text-right">
                <div className="flex justify-between font-bold text-base">
                  <span>Grand Total:</span>
                  <span>₹{completedSale.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid ({completedSale.paymentMethod}):</span>
                  <span>₹{completedSale.downPayment}</span>
                </div>
                {completedSale.paymentMethod === 'CREDIT' && (
                  <div className="flex justify-between font-semibold">
                    <span>Balance (Credit):</span>
                    <span>₹{completedSale.totalAmount - (Number(completedSale.downPayment) || 0)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 pt-3 mt-4 text-center space-y-1">
                <p className="font-bold text-base italic">Thanks for visiting! See you again!</p>
                <p className="text-[10px] text-gray-500 mt-2 font-sans">Software by BluNet IT Services</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setCompletedSale(null)}>Close</Button>
            <Button onClick={() => window.print()}><ReceiptText className="w-4 h-4 mr-2" /> Print Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
