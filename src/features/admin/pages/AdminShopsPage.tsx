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
import { Search, RefreshCw, Store, Trash2, CreditCard, CloudDownload, CloudUpload, PackageCheck, KeyRound, Eye, EyeOff } from "lucide-react";
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

  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Change Account Password states
  const [shopToChangePassword, setShopToChangePassword] = useState<ShopData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Change Admin Password states
  const [isAdminPasswordOpen, setIsAdminPasswordOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isUpdatingAdminPassword, setIsUpdatingAdminPassword] = useState(false);

  const handleUpdateAccountPassword = async () => {
    if (!shopToChangePassword) return;
    if (!newPassword || newPassword.trim().length < 4) {
      toast.error("Password must be at least 4 characters long");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/admin/shops/${shopToChangePassword._id}/password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Password for ${shopToChangePassword.name} updated successfully!`);
        setShopToChangePassword(null);
        setNewPassword("");
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch (err) {
      toast.error("Network error while updating password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateAdminPassword = async () => {
    if (!newAdminPassword || newAdminPassword.trim().length < 4) {
      toast.error("Admin password must be at least 4 characters long");
      return;
    }

    setIsUpdatingAdminPassword(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/admin/password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ password: newAdminPassword.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Master Admin password updated successfully!");
        setIsAdminPasswordOpen(false);
        setNewAdminPassword("");
      } else {
        toast.error(data.message || "Failed to update admin password");
      }
    } catch (err) {
      toast.error("Network error while updating admin password");
    } finally {
      setIsUpdatingAdminPassword(false);
    }
  };

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
    fetchDataRequests();
  }, []);

  const fetchDataRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/backup/admin/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDataRequests(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch data requests");
    }
  };

  const handleSeedSSBProducts = async () => {
    setIsSeeding(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/seed-ssb?force=true`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Successfully synced ${data.data?.totalProducts || 509} products for SSB Hi-Tech farm!`);
        fetchShops();
      } else {
        toast.error(data.message || "Failed to sync SSB farm products");
      }
    } catch (err: any) {
      toast.error("Network error while syncing products");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDownloadBackup = async (shopId: string, period: string, shopName: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/backup/admin/shops/${shopId}?period=${period}&clearData=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agroflow_backup_${shopName}_${period}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Backup downloaded and live data cleared!");
    } catch (err) {
      toast.error("Failed to download backup");
    }
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>, shopId: string, requestId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("backupFile", file);
    if (requestId) formData.append("requestId", requestId);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/backup/admin/shops/${shopId}/restore`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Backup data appended successfully!");
        fetchDataRequests();
      } else {
        toast.error(data.message || "Failed to restore backup");
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAdminPasswordOpen(true);
              setNewAdminPassword("");
              setShowAdminPassword(false);
            }}
            className="text-foreground border-input hover:bg-accent"
          >
            <KeyRound className="mr-2 h-4 w-4 text-amber-600" />
            Admin Password
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSeedSSBProducts}
            disabled={isSeeding}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            {isSeeding ? "Syncing Catalog..." : "Sync SSB Farm Catalog (509)"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchShops}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
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
                    No shops found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredShops.map((shop) => (
                  <TableRow key={shop._id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {shop.name}
                        {shop.name.toLowerCase().includes("ssb") && (
                          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                            509 Products
                          </Badge>
                        )}
                      </div>
                    </TableCell>
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
                      {shop.name.toLowerCase().includes("ssb") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSeedSSBProducts}
                          disabled={isSeeding}
                          title="Seed / Sync Products for SSB Hi-Tech farm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <PackageCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadBackup(shop._id, 'monthly', shop.name)}
                        title="Download Backup & Clear Old Data"
                      >
                        <CloudDownload className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShopToManageSub(shop);
                          setSubPrice((shop.subscriptionPrice || 1500).toString());
                          setSubEnforced(!!shop.isSubscriptionEnforced);
                        }}
                        title="Manage Subscription"
                      >
                        <CreditCard className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShopToChangePassword(shop);
                          setNewPassword("");
                          setShowPassword(false);
                        }}
                        title="Change Account Password"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setShopToDelete(shop)}
                        title="Delete Shop"
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

      {/* Pending Data Requests */}
      <div className="mt-8">
        <h3 className="text-xl font-bold tracking-tight mb-4">Pending Data Requests (₹50 Paid)</h3>
        {dataRequests.length === 0 ? (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
            No pending data requests.
          </div>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop Details</TableHead>
                  <TableHead>Requested Period</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataRequests.map((req) => (
                  <TableRow key={req._id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{req.shopId?.name}</p>
                      <p className="text-xs text-muted-foreground">{req.shopId?.phone}</p>
                    </TableCell>
                    <TableCell>
                      {req.month} {req.year}
                    </TableCell>
                    <TableCell>
                      {new Date(req.requestDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <label className="cursor-pointer relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                          <CloudUpload className="h-4 w-4" />
                          {isUploading ? "Uploading..." : "Upload JSON Backup"}
                          <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={(e) => handleUploadBackup(e, req.shopId?._id, req._id)}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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

      {/* Change Account Password Dialog */}
      <Dialog open={!!shopToChangePassword} onOpenChange={(open) => !open && setShopToChangePassword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Change Account Password
            </DialogTitle>
            <DialogDescription>
              Set a new login password for this shop account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="bg-muted/50 p-3 rounded-lg border text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shop Name:</span>
                <span className="font-semibold text-foreground">{shopToChangePassword?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner Name:</span>
                <span className="font-medium text-foreground">{shopToChangePassword?.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Login Phone:</span>
                <span className="font-mono font-semibold text-primary">{shopToChangePassword?.phone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="account-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 4 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user will use this new password along with their phone number (<span className="font-mono font-medium text-foreground">{shopToChangePassword?.phone}</span>) to log in.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShopToChangePassword(null)}
              disabled={isUpdatingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAccountPassword}
              disabled={isUpdatingPassword || !newPassword.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Admin Password Dialog */}
      <Dialog open={isAdminPasswordOpen} onOpenChange={(open) => !open && setIsAdminPasswordOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Change Master Admin Password
            </DialogTitle>
            <DialogDescription>
              Update the password for platform administrator access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="bg-muted/50 p-3 rounded-lg border text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin ID / Phone:</span>
                <span className="font-mono font-semibold text-primary">admin@agroflow.com / 9999999999</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-semibold text-emerald-600">MASTER ADMIN</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New Admin Password</Label>
              <div className="relative">
                <Input
                  id="admin-new-password"
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Enter new admin password (min. 4 characters)"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsAdminPasswordOpen(false)}
              disabled={isUpdatingAdminPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAdminPassword}
              disabled={isUpdatingAdminPassword || !newAdminPassword.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
            >
              {isUpdatingAdminPassword ? "Updating..." : "Update Admin Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
