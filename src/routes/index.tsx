import { createBrowserRouter, Navigate } from "react-router-dom";
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
import WhatsAppGatewayPage from "@/features/admin/pages/WhatsAppGatewayPage";
import SettingsPage from "@/features/shop/pages/SettingsPage";
import SoftwareBillingPage from "@/features/shop/pages/SoftwareBillingPage";
import NotificationPage from "@/features/shop/pages/NotificationPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
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
]);
