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
  XCircle 
} from "lucide-react";
import { DarkModeContext } from "@/components/home/dark-mode";

export type Payment = {
  id: string;
  time: string;
  status: "pending" | "processing" | "success" | "failed";
  email: string;
};

export const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "time",
    header: "Waktu Absen",
    cell: ({ row }) => {
      const time = row.getValue("time") as string;
      return (
        <div className="flex items-center gap-2 font-mono text-sm">
          <Clock className="w-4 h-4 text-blue-500" />
          <span>{time}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusConfig = {
        success: { label: "Hadir", color: "text-green-600", icon: CheckCircle2, bg: "bg-green-500/10" },
        processing: { label: "Sedang Proses", color: "text-yellow-600", icon: Loader2, bg: "bg-yellow-500/10" },
        failed: { label: "Gagal", color: "text-red-600", icon: XCircle, bg: "bg-red-500/10" },
        pending: { label: "Menunggu", color: "text-gray-600", icon: Clock, bg: "bg-gray-500/10" },
      };

      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
      const Icon = config.icon;

      return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color} font-medium text-xs`}>
          <motion.div
            animate={status === "processing" ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
          <span>{config.label}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="font-semibold"
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="lowercase font-medium">{row.getValue("email")}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;
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
              onClick={() => navigator.clipboard.writeText(payment.id)}
              className="cursor-pointer"
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              Lihat Detail
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function DataTableDemo() {
  const darkModeContext = React.useContext(DarkModeContext);
  if (!darkModeContext) throw new Error("DataTableDemo harus di dalam DarkModeProvider");
  const { darkMode } = darkModeContext;

  const [data, setData] = React.useState<Payment[]>([
    { id: "1", time: "", status: "success", email: "akmal@rad.co" },
    { id: "2", time: "", status: "success", email: "abe@rad.co" },
    { id: "3", time: "", status: "processing", email: "mat@rad.co" },
    { id: "4", time: "", status: "success", email: "iwan@rad.co" },
    { id: "5", time: "", status: "success", email: "agus@rad.co" },
    { id: "6", time: "", status: "failed", email: "morelo@rad.co" },
    { id: "7", time: "", status: "pending", email: "siti@rad.co" },
    { id: "8", time: "", status: "success", email: "budi@rad.co" },
  ]);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [debouncedFilter, setDebouncedFilter] = React.useState("");

  // Realtime Clock Update
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setData((prev) =>
        prev.map((row) => ({
          ...row,
          time: now,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Debounce Search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilter(globalFilter);
  }, 300);
    return () => clearTimeout(timeout);
  }, [globalFilter]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter: debouncedFilter,
    },
    onGlobalFilterChange: setDebouncedFilter,
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["ID", "Waktu Absen", "Status", "Email"];
    const rows = data.map((row) => [
      row.id,
      row.time,
      row.status,
      row.email,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absensi-realtime-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto p-6"
    >
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Cari email..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl backdrop-blur-xl"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl backdrop-blur-xl">
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
                    {col.id === "time" ? "Waktu Absen" : col.id === "status" ? "Status" : "Email"}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={exportToCSV}
            variant="outline"
            className="rounded-xl backdrop-blur-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table Container - Glassmorphism */}
      <div className={`rounded-2xl overflow-hidden border backdrop-blur-2xl shadow-2xl ${
        darkMode ? "bg-gray-900/70 border-gray-800" : "bg-white/70 border-gray-200"
      }`}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-bold text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                    className={`border-b transition-all duration-300 ${
                      darkMode 
                        ? "hover:bg-gray-800/50" 
                        : "hover:bg-gray-50"
                    } hover:shadow-lg hover:-translate-y-0.5`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
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

        <span className="text-sm text-gray-600">
          Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
        </span>
      </div>
    </motion.div>
  );
}