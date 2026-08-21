import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Plus,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";

interface Farmer {
  _id: string;
  name: string;
  phone: string;
  village?: string;
  status: string;
  creditBalance?: number;
  lastPurchaseDate?: string;
}

export default function FarmersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Farmer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerMobile, setNewFarmerMobile] = useState("");
  const [newFarmerVillage, setNewFarmerVillage] = useState("");
  const [isAddingFarmer, setIsAddingFarmer] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchFarmers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/farmers`, { headers: getHeaders() });
      const data = await response.json();
      if (response.ok && data.success) {
        setFarmers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch farmers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleAddFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingFarmer(true);

    try {
      const response = await fetch(`${API_BASE_URL}/farmers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: newFarmerName,
          phone: newFarmerMobile,
          village: newFarmerVillage,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("New farmer added successfully");
        setIsAddOpen(false);
        setNewFarmerName("");
        setNewFarmerMobile("");
        setNewFarmerVillage("");
        fetchFarmers(); // Refresh the list
      } else {
        toast.error(data.message || "Failed to add farmer");
      }
    } catch (err) {
      toast.error("Cannot connect to server.");
    } finally {
      setIsAddingFarmer(false);
    }
  };

  const filteredFarmers = farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.phone.includes(searchTerm)
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
          <h2 className="text-3xl font-bold tracking-tight">Farmers</h2>
          <p className="text-muted-foreground">
            Manage your customer base and view their credit history.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-btn shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Add Farmer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Farmer</DialogTitle>
              <DialogDescription>
                Enter the details of the new farmer below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFarmer} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required value={newFarmerName} onChange={(e) => setNewFarmerName(e.target.value)} placeholder="e.g. Ramesh Patel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input id="mobile" required value={newFarmerMobile} onChange={(e) => setNewFarmerMobile(e.target.value)} placeholder="e.g. 9876543210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Input id="village" required value={newFarmerVillage} onChange={(e) => setNewFarmerVillage(e.target.value)} placeholder="e.g. Rampur" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isAddingFarmer}>{isAddingFarmer ? "Adding..." : "Save Farmer"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between border-b">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search farmers by name or phone..."
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
                <TableHead>Farmer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFarmers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No farmers match your search." : "No farmers registered. Add your first farmer to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFarmers.map((farmer) => (
                  <TableRow key={farmer._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${farmer.name}`} />
                          <AvatarFallback>{getInitials(farmer.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{farmer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Phone className="mr-2 h-3 w-3 text-muted-foreground" />
                        {farmer.phone}
                      </div>
                    </TableCell>
                    <TableCell>{farmer.village || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{farmer.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div>Showing {filteredFarmers.length} of {farmers.length} farmers</div>
        </div>
      </div>
    </div>
  );
}
