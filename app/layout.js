import "./globals.css";

export const metadata = {
  title: "LPE HUB",
  description: "License & Permit Expatriate HUB - Internal Employee Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full bg-orange-50">{children}</body>
    </html>
  );
}
