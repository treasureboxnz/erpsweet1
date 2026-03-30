import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import ERPLayout from "./components/ERPLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomersNew from "./pages/CustomersNew";
import Products from "./pages/Products";

import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import OperationLogs from "./pages/OperationLogs";
import CustomerDetail from "./pages/CustomerDetail";
import Positions from "./pages/Positions";
import Permissions from "./pages/Permissions";
import AcceptInvite from "./pages/AcceptInvite";

import VariantCreate from "./pages/VariantCreate";
import PositionCreate from "./pages/PositionCreate";
import MediaLibrary from "./pages/MediaLibrary";
import ProductEdit from "./pages/ProductEdit";
import ProductCreate from "./pages/ProductCreate";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import SupplierCreate from "./pages/SupplierCreate";
import SupplierEdit from "./pages/SupplierEdit";
import SupplierDetail from "./pages/SupplierDetail";
import SupplierCategories from "./pages/SupplierCategories";
import OrderCreate from "./pages/OrderCreate";
import OrderEdit from "./pages/OrderEdit";
import OrderDetail from "./pages/OrderDetail";
import TagManagement from "./pages/TagManagement";
import AttributeManagement from "./pages/AttributeManagement";
import SystemSettings from "./pages/SystemSettings";
import CompanySettings from "./pages/CompanySettings";
import QuotationList from "./pages/QuotationList";
import QuotationCreate from "./pages/QuotationCreate";
import QuotationDetail from "./pages/QuotationDetail";
import QuotationEdit from "./pages/QuotationEdit";
import QuotationConvert from "./pages/QuotationConvert";
import PendingApprovals from "./pages/PendingApprovals";
import { MaterialManagement } from "./pages/MaterialManagement";
import { SupplierDetail as MaterialSupplierDetail } from "./pages/MaterialManagement/SupplierDetail";
import MaterialTypes from "./pages/MaterialTypes";
import EmailGenerator from "./pages/EmailGenerator";
import InvoiceTermsManagement from "./pages/InvoiceTermsManagement";
import InvoiceTemplateConfig from "./pages/InvoiceTemplateConfig";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import SkuRulesSettings from "./pages/Settings/SkuRulesSettings";
import ApolloPage from "./pages/Apollo";

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <ERPLayout>
          <Dashboard />
        </ERPLayout>
      </Route>
      <Route path={"/customers"}>
        <ERPLayout>
          <CustomersNew />
        </ERPLayout>
      </Route>
      <Route path={"/customers/:id"}>
        {(params) => (
          <ERPLayout>
            <CustomerDetail params={params} />
          </ERPLayout>
        )}
      </Route>
      <Route path={"/customers-old"}>
        <ERPLayout>
          <Customers />
        </ERPLayout>
      </Route>
      <Route path={"/categories"}>
        <ERPLayout>
          <Categories />
        </ERPLayout>
      </Route>
      <Route path={"/suppliers"}>
        <ERPLayout>
          <Suppliers />
        </ERPLayout>
      </Route>
      <Route path={"/suppliers/categories"}>
        <ERPLayout>
          <SupplierCategories />
        </ERPLayout>
      </Route>
      <Route path={"/utilities/tags"}>
        <ERPLayout>
          <TagManagement />
        </ERPLayout>
      </Route>
      <Route path={"/management/attributes"}>
        <ERPLayout>
          <AttributeManagement />
        </ERPLayout>
      </Route>
      <Route path={"/suppliers/new"}>
        <ERPLayout>
          <SupplierCreate />
        </ERPLayout>
      </Route>
      <Route path={"/suppliers/:id/edit"}>
        <ERPLayout>
          <SupplierEdit />
        </ERPLayout>
      </Route>
      <Route path={"/suppliers/:id"}>
        {(params) => (
          <ERPLayout>
            <SupplierDetail />
          </ERPLayout>
        )}
      </Route>
      <Route path={"/products"}>
        <ERPLayout>
          <Products />
        </ERPLayout>
      </Route>
      <Route path={"/products/new"}>
        <ERPLayout>
          <ProductCreate />
        </ERPLayout>
      </Route>
      <Route path={"/products/:id/edit"}>
        <ProductEdit />
      </Route>
      <Route path={"/products/:productId/variants/new"}>
        <ERPLayout>
          <VariantCreate />
        </ERPLayout>
      </Route>


      <Route path={"/media-library"}>
        <MediaLibrary />
      </Route>
      <Route path={"/orders"}>
        <ERPLayout>
          <Orders />
        </ERPLayout>
      </Route>
      <Route path={"/orders/new"}>
        <ERPLayout>
          <OrderCreate />
        </ERPLayout>
      </Route>
      <Route path={"/orders/:id/edit"}>
        <ERPLayout>
          <OrderEdit />
        </ERPLayout>
      </Route>
      <Route path={"/orders/:id"}>
        {(params) => (
          <ERPLayout>
            <OrderDetail />
          </ERPLayout>
        )}
      </Route>
      <Route path={"/quotations"}>
        <ERPLayout>
          <QuotationList />
        </ERPLayout>
      </Route>
      <Route path={"/quotations/create"}>
        <ERPLayout>
          <QuotationCreate />
        </ERPLayout>
      </Route>
      <Route path={"/approvals/pending"}>
        <ERPLayout>
          <PendingApprovals />
        </ERPLayout>
      </Route>
      <Route path={"/quotations/:id/edit"}>
        {(params) => (
          <ERPLayout>
            <QuotationEdit />
          </ERPLayout>
        )}
      </Route>
      <Route path={"/quotations/:id/convert"}>
        {(params) => (
          <ERPLayout>
            <QuotationConvert />
          </ERPLayout>
        )}
      </Route>
      <Route path={"/quotations/:id"}>
        <ERPLayout>
          <QuotationDetail />
        </ERPLayout>
      </Route>
      <Route path={"/materials/suppliers/:id"}>
        {(params) => (
          <ERPLayout>
            <MaterialSupplierDetail />
          </ERPLayout>
        )}
      </Route>
      <Route path={"/materials/types"}>
        <ERPLayout>
          <MaterialTypes />
        </ERPLayout>
      </Route>
      <Route path={"/materials"}>
        <ERPLayout>
          <MaterialManagement />
        </ERPLayout>
      </Route>

      <Route path={"/utilities/email-generator"}>
        <ERPLayout>
          <EmailGenerator />
        </ERPLayout>
      </Route>
      <Route path={"/settings/invoice-terms"}>
        <ERPLayout>
          <InvoiceTermsManagement />
        </ERPLayout>
      </Route>
      <Route path={"/settings/invoice-template"}>
        <ERPLayout>
          <InvoiceTemplateConfig />
        </ERPLayout>
      </Route>
      <Route path={"/reports"}>
        <ERPLayout>
          <Reports />
        </ERPLayout>
      </Route>
      <Route path={"/users"}>
        <ERPLayout>
          <UserManagement />
        </ERPLayout>
      </Route>
      <Route path={"/users/positions"}>
        <ERPLayout>
          <Positions />
        </ERPLayout>
      </Route>
      <Route path={"/users/positions/new"}>
        <ERPLayout>
          <PositionCreate />
        </ERPLayout>
      </Route>
      <Route path={"/users/permissions"}>
        <ERPLayout>
          <Permissions />
        </ERPLayout>
      </Route>
      <Route path={"/profile"}>
        <ERPLayout>
          <Profile />
        </ERPLayout>
      </Route>
      <Route path={"/logs"}>
        <ERPLayout>
          <OperationLogs />
        </ERPLayout>
      </Route>
      <Route path={"/settings/system"}>
        <ERPLayout>
          <SystemSettings />
        </ERPLayout>
      </Route>
      <Route path={"/settings/company"}>
        <ERPLayout>
          <CompanySettings />
        </ERPLayout>
      </Route>
      <Route path={"/settings/sku-rules"}>
        <ERPLayout>
          <SkuRulesSettings />
        </ERPLayout>
      </Route>
      <Route path={"/apollo"}>
        <ApolloPage />
      </Route>
      <Route path={"/login"}>
        <Login />
      </Route>
      <Route path={"/change-password"}>
        <ERPLayout>
          <ChangePassword />
        </ERPLayout>
      </Route>
      <Route path={"/ invite/:token"}>
        <AcceptInvite />
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
