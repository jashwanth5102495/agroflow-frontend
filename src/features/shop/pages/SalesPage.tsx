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
import { Search, Plus, Trash2, ReceiptText } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  category?: string;
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

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, farmersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/products`, { headers: getHeaders() }),
          fetch(`${API_BASE_URL}/farmers`, { headers: getHeaders() }),
        ]);
        const productsData = await productsRes.json();
        const farmersData = await farmersRes.json();

        if (productsRes.ok && productsData.success) {
          setProducts(productsData.data || []);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Point of Sale</h2>
        <p className="text-muted-foreground">
          Create new sales invoices and process payments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Side: Product Selection */}
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
                    className="border rounded-lg p-3 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card flex flex-col justify-between h-28"
                    onClick={() => addToCart(product)}
                  >
                    <div>
                      <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{product.category || ""}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-semibold text-primary">₹{product.sellingPrice}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary hover:text-white">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Cart & Checkout */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle>Current Sale</CardTitle>
              <div className="mt-4 space-y-2">
                <Label>Select Farmer</Label>
                <Select defaultValue="walkin">
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
              <Button className="w-full gradient-btn shadow-md py-6 text-lg mt-2" disabled={cart.length === 0}>
                <ReceiptText className="mr-2 h-5 w-5" /> Generate Invoice
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
