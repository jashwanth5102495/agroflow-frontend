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
import { Search, RefreshCw, Store, Trash2, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  subscriptionPrice?: number;
  isSubscriptionEnforced?: boolean;
  subscriptionStatus?: string;
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [shopToDelete, setShopToDelete] = useState<ShopData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [shopToManageSub, setShopToManageSub] = useState<ShopData | null>(null);
  const [subPrice, setSubPrice] = useState("1500");
  const [subEnforced, setSubEnforced] = useState(false);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

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

  const handleDeleteShop = async () => {
    if (!shopToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/admin/shops/${shopToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Shop deleted successfully");
        fetchShops(); // Refresh list
      } else {
        toast.error(data.message || "Failed to delete shop");
      }
    } catch (err) {
      toast.error("Cannot connect to server to delete shop.");
    } finally {
      setIsDeleting(false);
      setShopToDelete(null);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!shopToManageSub) return;
    setIsUpdatingSub(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/admin/shops/${shopToManageSub._id}/subscription`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionPrice: Number(subPrice),
          isSubscriptionEnforced: subEnforced
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Subscription settings updated!");
        setShopToManageSub(null);
        fetchShops();
      } else {
        toast.error(data.message || "Failed to update subscription");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsUpdatingSub(false);
    }
  };

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShopToManageSub(shop);
                          setSubPrice((shop.subscriptionPrice || 1500).toString());
                          setSubEnforced(!!shop.isSubscriptionEnforced);
                        }}
                      >
                        <CreditCard className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setShopToDelete(shop)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!shopToDelete} onOpenChange={(open) => !open && setShopToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shop</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{shopToDelete?.name}</span>? 
              This action cannot be undone. All users and data associated with this shop will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShopToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteShop} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Subscription Dialog */}
      <Dialog open={!!shopToManageSub} onOpenChange={(open) => !open && setShopToManageSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Configure auto-pay subscription settings for {shopToManageSub?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monthly Subscription Price (₹)</Label>
              <Input 
                type="number" 
                value={subPrice} 
                onChange={(e) => setSubPrice(e.target.value)} 
              />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-lg">
              <div>
                <Label className="text-base">Enforce Subscription</Label>
                <p className="text-xs text-muted-foreground">If enabled, shop owner must pay to use the software.</p>
              </div>
              <Switch checked={subEnforced} onCheckedChange={setSubEnforced} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopToManageSub(null)} disabled={isUpdatingSub}>Cancel</Button>
            <Button onClick={handleUpdateSubscription} disabled={isUpdatingSub}>
              {isUpdatingSub ? "Updating..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
