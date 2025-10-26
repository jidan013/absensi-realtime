import { DarkModeProvider } from "@/components/home/dark-mode";
import Navbar from "@/components/home/home-navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <div>
        <DarkModeProvider>
            <Navbar />
            {children}
        </DarkModeProvider>
    </div>;
}