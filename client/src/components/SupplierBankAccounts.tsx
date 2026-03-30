import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Star, Save } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = [
  { value: "USD", label: "美元 (USD)" },
  { value: "CNY", label: "人民币 (CNY)" },
  { value: "EUR", label: "欧元 (EUR)" },
  { value: "GBP", label: "英镑 (GBP)" },
  { value: "JPY", label: "日元 (JPY)" },
  { value: "AUD", label: "澳元 (AUD)" },
  { value: "CAD", label: "加元 (CAD)" },
  { value: "HKD", label: "港币 (HKD)" },
  { value: "SGD", label: "新加坡元 (SGD)" },
  { value: "KRW", label: "韩元 (KRW)" },
];

interface BankAccountForm {
  id?: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  swiftCode: string;
  iban: string;
  routingNumber: string;
  bankAddress: string;
  isDefault: boolean;
}

interface SupplierBankAccountsProps {
  supplierId: number;
}

export default function SupplierBankAccounts({ supplierId }: SupplierBankAccountsProps) {
  const utils = trpc.useUtils();
  const [bankAccountForms, setBankAccountForms] = useState<BankAccountForm[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // 查询供应商银行账户列表
  const { data: bankAccounts = [], isLoading } = trpc.bankAccounts.getSupplierBankAccounts.useQuery(
    { supplierId },
    { enabled: !!supplierId }
  );

  // 添加银行账户mutation
  const addBankAccount = trpc.bankAccounts.createSupplierBankAccount.useMutation({
    onSuccess: () => {
      toast.success("银行账户添加成功");
      utils.bankAccounts.getSupplierBankAccounts.invalidate({ supplierId });
      setIsAddingAccount(false);
    },
    onError: (error) => {
      toast.error(`添加失败：${error.message}`);
    },
  });

  // 更新银行账户mutation
  const updateBankAccount = trpc.bankAccounts.updateSupplierBankAccount.useMutation({
    onSuccess: () => {
      toast.success("银行账户更新成功");
      utils.bankAccounts.getSupplierBankAccounts.invalidate({ supplierId });
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除银行账户mutation
  const deleteBankAccount = trpc.bankAccounts.deleteSupplierBankAccount.useMutation({
    onSuccess: () => {
      toast.success("银行账户删除成功");
      utils.bankAccounts.getSupplierBankAccounts.invalidate({ supplierId });
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // 当bankAccounts加载完成时，更新表单
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0) {
      setBankAccountForms(
        bankAccounts.map((account) => ({
          id: account.id,
          bankName: account.bankName || "",
          accountName: account.accountName || "",
          accountNumber: account.accountNumber || "",
          currency: account.currency || "USD",
          swiftCode: account.swiftCode || "",
          iban: account.iban || "",
          routingNumber: account.routingNumber || "",
          bankAddress: account.bankAddress || "",
          isDefault: account.isDefault || false,
        }))
      );
    }
  }, [bankAccounts]);

  // 添加新银行账户
  const handleAddBankAccount = () => {
    setIsAddingAccount(true);
    setBankAccountForms([
      ...bankAccountForms,
      {
        bankName: "",
        accountName: "",
        accountNumber: "",
        currency: "USD",
        swiftCode: "",
        iban: "",
        routingNumber: "",
        bankAddress: "",
        isDefault: false,
      },
    ]);
  };

  // 保存银行账户
  const handleSaveBankAccount = (index: number) => {
    const account = bankAccountForms[index];

    if (!account.bankName || !account.accountName || !account.accountNumber) {
      toast.error("请填写必填字段（银行名称、账户名称、账户号码）");
      return;
    }

    if (account.id) {
      // 更新现有账户
      updateBankAccount.mutate({
        id: account.id,
        data: account,
      });
    } else {
      // 添加新账户
      addBankAccount.mutate({
        ...account,
        supplierId,
      });
    }
  };

  // 删除银行账户
  const handleDeleteBankAccount = (index: number) => {
    const account = bankAccountForms[index];

    if (account.id) {
      // 删除已保存的账户
      deleteBankAccount.mutate({ id: account.id });
    } else {
      // 删除未保存的新账户
      setBankAccountForms(bankAccountForms.filter((_, i) => i !== index));
      setIsAddingAccount(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">银行账户</h3>
          <p className="text-sm text-muted-foreground">用于工厂版Invoice的供应商收款账户信息</p>
        </div>
        <Button onClick={handleAddBankAccount} size="sm" disabled={isAddingAccount}>
          <Plus className="mr-2 h-4 w-4" />
          添加账户
        </Button>
      </div>

      {bankAccountForms.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              暂无银行账户，点击"添加账户"按钮添加
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bankAccountForms.map((account, index) => (
            <Card key={index} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">账户 {index + 1}</h4>
                    {account.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        <Star className="h-3 w-3 fill-current" />
                        默认账户
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveBankAccount(index)}
                      disabled={addBankAccount.isPending || updateBankAccount.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBankAccount(index)}
                      disabled={deleteBankAccount.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>银行名称 *</Label>
                    <Input
                      value={account.bankName}
                      onChange={(e) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].bankName = e.target.value;
                        setBankAccountForms(newForms);
                      }}
                      placeholder="中国银行"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>账户名称 *</Label>
                    <Input
                      value={account.accountName}
                      onChange={(e) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].accountName = e.target.value;
                        setBankAccountForms(newForms);
                      }}
                      placeholder="供应商全称"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>账户号码 *</Label>
                    <Input
                      value={account.accountNumber}
                      onChange={(e) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].accountNumber = e.target.value;
                        setBankAccountForms(newForms);
                      }}
                      placeholder="6222 0000 0000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>货币类型</Label>
                    <Select
                      value={account.currency}
                      onValueChange={(value) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].currency = value;
                        setBankAccountForms(newForms);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SWIFT代码</Label>
                    <Input
                      value={account.swiftCode}
                      onChange={(e) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].swiftCode = e.target.value;
                        setBankAccountForms(newForms);
                      }}
                      placeholder="BKCHCNBJ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN</Label>
                    <Input
                      value={account.iban}
                      onChange={(e) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].iban = e.target.value;
                        setBankAccountForms(newForms);
                      }}
                      placeholder="GB29 NWBK 6016 1331 9268 19"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Routing Number</Label>
                    <Input
                      value={account.routingNumber}
                      onChange={(e) => {
                        const newForms = [...bankAccountForms];
                        newForms[index].routingNumber = e.target.value;
                        setBankAccountForms(newForms);
                      }}
                      placeholder="021000021"
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`isDefault-${index}`}
                        checked={account.isDefault}
                        onCheckedChange={(checked) => {
                          const newForms = [...bankAccountForms];
                          newForms[index].isDefault = checked as boolean;
                          setBankAccountForms(newForms);
                        }}
                      />
                      <Label htmlFor={`isDefault-${index}`} className="cursor-pointer">
                        设为默认账户
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>银行地址</Label>
                  <Textarea
                    value={account.bankAddress}
                    onChange={(e) => {
                      const newForms = [...bankAccountForms];
                      newForms[index].bankAddress = e.target.value;
                      setBankAccountForms(newForms);
                    }}
                    placeholder="银行分行地址"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
