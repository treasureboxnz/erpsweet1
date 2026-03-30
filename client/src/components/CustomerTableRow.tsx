import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { MapPin } from "lucide-react";

type Company = {
  id: number;
  companyName: string;
  customerCode: string | null;
  customerNature: string | null;
  customerCategory: string[] | null;
  country: string | null;
  cooperationLevel: string | null;
  cooperationStatus: string;
  createdAt: Date;
  logoUrl?: string | null;
};

interface CustomerTableRowProps {
  company: Company;
  isAdmin: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onViewDetails: (id: number) => void;
}

const getCooperationStatusBadge = (cooperationStatus: string) => {
  const badges = {
    developing: "bg-blue-50 text-blue-700 border border-blue-200",
    cooperating: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    stopped: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  const labels = {
    developing: "开发中",
    cooperating: "合作中",
    stopped: "已停止",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[cooperationStatus as keyof typeof badges]}`}>
      {labels[cooperationStatus as keyof typeof labels]}
    </span>
  );
};

function CompanyAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const initials = name
    ?.split(' ')
    .filter((w: string) => w.length > 0)
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join('') || '?';

  return (
    <div className="relative h-7 w-7 flex-shrink-0">
      {logoUrl && (
        <img
          src={logoUrl}
          alt={name}
          className="h-7 w-7 rounded-full object-cover border border-gray-100 absolute inset-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div
        className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xs"
        style={{ zIndex: logoUrl ? -1 : 0 }}
      >
        {initials}
      </div>
    </div>
  );
}

export const CustomerTableRow = memo(function CustomerTableRow({
  company,
  isAdmin,
  isSelected,
  onToggleSelect,
  onViewDetails,
}: CustomerTableRowProps) {
  return (
    <TableRow>
      {isAdmin && (
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(company.id)}
          />
        </TableCell>
      )}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <CompanyAvatar name={company.companyName} logoUrl={company.logoUrl} />
          <span>{company.companyName}</span>
        </div>
      </TableCell>
      <TableCell>{company.customerCode || "暂无"}</TableCell>
      <TableCell>
        {company.customerNature || "暂无"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {company.country && <MapPin className="h-3 w-3 text-gray-400" />}
          {company.country || "暂无"}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-foreground">{company.cooperationLevel || '-'}</span>
      </TableCell>
      <TableCell>{getCooperationStatusBadge(company.cooperationStatus)}</TableCell>
      <TableCell>{new Date(company.createdAt).toLocaleDateString("zh-CN")}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={() => onViewDetails(company.id)}>
          查看详情
        </Button>
      </TableCell>
    </TableRow>
  );
});
