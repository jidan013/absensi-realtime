import HomeClient from "@/components/home/home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="flex-1 min-h-screen">
      <main className="">
        <HomeClient />
      </main>
    </div>
  );
}