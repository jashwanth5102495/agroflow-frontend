import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";

export default function RegisterShopPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const body = {
        shopName: formData.get("shopName") as string,
        ownerName: formData.get("ownerName") as string,
        phone: formData.get("phone") as string,
        email: (formData.get("email") as string) || undefined,
        password,
        address: formData.get("address") as string,
        village: (formData.get("village") as string) || undefined,
        district: formData.get("district") as string,
        state: formData.get("state") as string,
        pincode: formData.get("pincode") as string,
        gstNumber: (formData.get("gstNumber") as string) || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/auth/register-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("shop", JSON.stringify(data.data.shop));
        toast.success("Shop registered successfully!");
        navigate("/shop");
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err) {
      toast.error("Cannot connect to server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Register Shop</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Create a new fertilizer shop account.
        </p>
      </div>

      <div className="flex-1">
        <form className="space-y-6 pb-6" onSubmit={handleRegister}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input id="shopName" name="shopName" required placeholder="Sri Ram Fertilizers" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name</Label>
              <Input id="ownerName" name="ownerName" required placeholder="John Doe" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input id="phone" name="phone" required placeholder="9876543210" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="john@example.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST Number (Optional)</Label>
            <Input id="gstNumber" name="gstNumber" placeholder="22AAAAA0000A1Z5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" required placeholder="123 Market Street" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="village">Village</Label>
              <Input id="village" name="village" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" name="district" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" name="pincode" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
          </div>

          <Button type="submit" className="w-full gradient-btn shadow-md py-6 text-lg mt-4" disabled={isLoading}>
            {isLoading ? "Registering..." : "Complete Registration"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground pt-4 border-t">
        Already have an account?{" "}
        <Link to="/auth/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
