import { Navbar } from "@/components/Navbar";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
