import Link from "next/link";
import { Phone, Mail } from "lucide-react";



export default function FooterClient(){
    return(
        <footer className="bg-black text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">RAD</span> Absensi
              </h2>
              <p className="text-sm leading-relaxed">Absen pake AI. Cepat, akurat, dan bikin hidup HR jadi lebih chill.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Navigasi</h4>
              <ul className="space-y-2 text-sm">
                {["Home", "Absensi", "Kontak"].map((item) => (
                  <li key={item}><Link href="#" className="hover:text-cyan-400 transition">→ {item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Layanan</h4>
              <ul className="space-y-2 text-sm">
                {["Realtime", "Data Privacy", "Support 24/7"].map((item) => (
                  <li key={item} className="hover:text-cyan-400 transition cursor-pointer">• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Hubungi</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-400" /> advent@mail.go.id</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> +62 812-3456-7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} RAD Absensi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    )
}