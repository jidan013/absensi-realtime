"use client";

import * as React from "react";
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Download,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  Eye,
  User,
  Smartphone,
  Laptop,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── Tipe data real ─────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: string;
  user: {
    name: string;
    email: string;
    position: string;
  };
  clockIn: string | null;
  clockOut: string | null;
  method: "QR" | "FACE" | "MANUAL";
  device: string | null;
  ipAddress: string | null;
  location: {
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: AttendanceRecord[];
}

// ── Helper functions ──
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDuration = (clockIn: string | null, clockOut: string | null) => {
  if (!clockIn || !clockOut) return "-";
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  const durationMs = end - start;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  if (minutes > 0) return `${minutes} menit`;
  return "kurang dari 1 menit";
};

// ── Status badge component ──
const StatusBadge = ({ clockIn, clockOut }: { clockIn: string | null; clockOut: string | null }) => {
  if (!clockIn) return null;
  const isClockedOut = clockOut !== null;
  
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 px-3 py-1.5 rounded-full ${
        isClockedOut
          ? "bg-green-500/10 text-green-500 border-green-500/20"
          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isClockedOut ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
      {isClockedOut ? "Selesai" : "Sedang Bekerja"}
    </Badge>
  );
};

// ── Method badge component ──
const MethodBadge = ({ method }: { method: AttendanceRecord["method"] }) => {
  const config = {
    QR: { label: "QR Code", icon: Smartphone, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    FACE: { label: "Face Recognition", icon: Eye, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    MANUAL: { label: "Manual", icon: User, color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  };
  
  const { label, icon: Icon, color } = config[method];
  
  return (
    <Badge variant="outline" className={`gap-1.5 px-2 py-1 rounded-lg ${color}`}>
      <Icon className="w-3 h-3" />
      <span className="text-xs">{label}</span>
    </Badge>
  );
};

// ── Device badge ──
const DeviceBadge = ({ device }: { device: string | null }) => {
  if (!device) return <span className="text-xs text-muted-foreground">-</span>;
  
  const isMobile = device.toLowerCase().includes("mobile") || device.toLowerCase().includes("android") || device.toLowerCase().includes("ios");
  const Icon = isMobile ? Smartphone : Laptop;
  
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{device}</span>
    </div>
  );
};

// ── Columns definition ──
export const columns: ColumnDef<AttendanceRecord>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "user.name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="font-semibold"
      >
        Karyawan
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div>
          <div className="font-medium text-sm">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.position}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "clockIn",
    header: "Jam Masuk",
    cell: ({ row }) => {
      const clockIn = row.original.clockIn;
      return (
        <div>
          <div className="font-mono text-sm">{formatDateTime(clockIn)}</div>
          <div className="text-xs text-muted-foreground">
            {clockIn ? formatDate(clockIn) : "-"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "clockOut",
    header: "Jam Pulang",
    cell: ({ row }) => {
      const clockOut = row.original.clockOut;
      return (
        <div>
          <div className="font-mono text-sm">{formatDateTime(clockOut)}</div>
          <div className="text-xs text-muted-foreground">
            {clockOut ? formatDuration(row.original.clockIn, clockOut) : "-"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge clockIn={row.original.clockIn} clockOut={row.original.clockOut} />,
  },
  {
    accessorKey: "method",
    header: "Metode",
    cell: ({ row }) => <MethodBadge method={row.original.method} />,
  },
  {
    accessorKey: "device",
    header: "Perangkat",
    cell: ({ row }) => <DeviceBadge device={row.original.device} />,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const record = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(record.id)}
              className="cursor-pointer"
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Lihat Lokasi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// ── Main component ──
export function DataTableDemo() {
  const [data, setData] = React.useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [debouncedFilter, setDebouncedFilter] = React.useState("");

  // Debounce search
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedFilter(globalFilter), 300);
    return () => clearTimeout(timeout);
  }, [globalFilter]);

  // Fetch real data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v1/attendance/recent", {
          credentials: "include",
        });
        
        if (response.ok) {
          const result: ApiResponse = await response.json();
          if (result.success) {
            setData(result.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: { globalFilter: debouncedFilter },
    onGlobalFilterChange: setDebouncedFilter,
  });

  // Export ke CSV
  const exportToCSV = () => {
    const headers = ["ID", "Karyawan", "Email", "Jam Masuk", "Jam Pulang", "Status", "Metode", "Perangkat"];
    const rows = data.map((record) => [
      record.id,
      record.user.name,
      record.user.email,
      formatDateTime(record.clockIn),
      formatDateTime(record.clockOut),
      record.clockOut ? "Selesai" : "Sedang Bekerja",
      record.method,
      record.device || "-",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absensi-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data absensi...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-full mx-auto"
    >
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Cari karyawan..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                Kolom <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {col.id === "user.name" ? "Karyawan" : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={exportToCSV} variant="outline" className="rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden border bg-blue-950 dark:bg-gray-900/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-bold text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="border-b hover:bg-muted/50 transition-all duration-300"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 opacity-50" />
                      <p>Belum ada data absensi</p>
                      <p className="text-xs">Data akan muncul setelah karyawan melakukan absen</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Menampilkan</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-20 h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>baris per halaman</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-xl"
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-xl"
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </motion.div>
  );
}