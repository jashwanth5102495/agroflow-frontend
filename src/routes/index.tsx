import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterShopPage from "@/features/auth/pages/RegisterShopPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import DashboardPage from "@/features/shop/pages/DashboardPage";
import InventoryPage from "@/features/shop/pages/InventoryPage";
import FarmersPage from "@/features/shop/pages/FarmersPage";
import SalesPage from "@/features/shop/pages/SalesPage";
import CreditLedgerPage from "@/features/shop/pages/CreditLedgerPage";
import ReportsPage from "@/features/shop/pages/ReportsPage";
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";
import AdminShopsPage from "@/features/admin/pages/AdminShopsPage";
import AdminAgentsPage from "@/features/admin/pages/AdminAgentsPage";
import AdminReportsPage from "@/features/admin/pages/AdminReportsPage";
import AdminLoginPage from "@/features/admin/pages/AdminLoginPage";
import WhatsAppGatewayPage from "@/features/admin/pages/WhatsAppGatewayPage";
import SettingsPage from "@/features/shop/pages/SettingsPage";
import SoftwareBillingPage from "@/features/shop/pages/SoftwareBillingPage";
import NotificationPage from "@/features/shop/pages/NotificationPage";
import CashierLayout from "@/layouts/CashierLayout";
import CashierAuthPage from "@/features/auth/pages/CashierAuthPage";

// Secure Admin Route Guard
function AdminGuard() {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  if (!token || user?.role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterShopPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
    ],
  },
  {
    path: "/shop",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "inventory",
        element: <InventoryPage />,
      },
      {
        path: "farmers",
        element: <FarmersPage />,
      },
      {
        path: "sales",
        element: <SalesPage />,
      },
      {
        path: "credit",
        element: <CreditLedgerPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "billing",
        element: <SoftwareBillingPage />,
      },
      {
        path: "notification",
        element: <NotificationPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: "agents",
            element: <AdminAgentsPage />,
          },
          {
            path: "shops",
            element: <AdminShopsPage />,
          },
          {
            path: "reports",
            element: <AdminReportsPage />,
          },
          {
            path: "whatsapp-gateway",
            element: <WhatsAppGatewayPage />,
          },
        ],
      },
    ],
  },
  {
    path: "/settings",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: "/cashier/auth/:shopId/:token",
    element: <CashierAuthPage />,
  },
  {
    path: "/cashier/:shopId",
    element: <CashierLayout />,
    children: [
      {
        index: true,
        // Optional: Could redirect to /cashier/:shopId/sales but we can't easily use Navigate with params here in a simple way
        // So let's render a component that redirects
        element: <Navigate to="sales" replace />,
      },
      {
        path: "sales",
        element: <SalesPage />,
      },
      {
        path: "farmers",
        element: <FarmersPage />,
      },
      {
        path: "inventory",
        element: <InventoryPage />,
      },
      {
        path: "credit",
        element: <CreditLedgerPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/auth/login" replace />,
  },
]);
