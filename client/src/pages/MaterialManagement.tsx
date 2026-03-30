import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { MaterialSuppliersTab } from "./MaterialManagement/MaterialSuppliersTab";
import { MaterialBoardsTab } from "./MaterialManagement/MaterialBoardsTab";
import { MaterialColorsTab } from "./MaterialManagement/MaterialColorsTab";

export function MaterialManagement() {
  const [activeTab, setActiveTab] = useState("suppliers");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">材料管理</h1>
        <p className="text-muted-foreground mt-2">
          管理材料供应商、布板和布料颜色
        </p>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suppliers">材料供应商</TabsTrigger>
            <TabsTrigger value="boards">材料分类 (e.g. 布板/木腿/三胺)</TabsTrigger>
            <TabsTrigger value="colors">颜色</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-6">
            <MaterialSuppliersTab />
          </TabsContent>

          <TabsContent value="boards" className="mt-6">
            <MaterialBoardsTab />
          </TabsContent>

          <TabsContent value="colors" className="mt-6">
            <MaterialColorsTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
