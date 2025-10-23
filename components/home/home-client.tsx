"use client";

import HomeNavbar from "./home-navbar";
import Image from "next/image";
import Foto from "@/public/image.jpg";
import { DataTableDemo } from "./home-table";

export default function HomeClient() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="flex flex-col md:flex-row items-center justify-between px-8 md:px-16 py-16 gap-10">
        {/* Text Section */}
        <div className="max-w-lg text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Selamat Datang di Website RAD
          </h1>
          <p className="text-gray-700 leading-relaxed">
            Website dengan fitur Realtime Absensi menggunakan metode <span className="font-medium">Rapid Application Development (RAD)</span>.
          </p>
        </div>

        {/* Image Section */}
        <div className="w-full md:w-1/2 flex justify-center">
          <Image
            src={Foto}
            alt="Image home"
            priority
            className="rounded-lg shadow-lg object-cover w-full h-auto max-h-[350px]"
          />
        </div>
      </div>
      <DataTableDemo />
    </div>
  );
}
