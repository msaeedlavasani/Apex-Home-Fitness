import '../globals.css';

export default function AdminRootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" dir="ltr">
      <body className="bg-apex-surface text-apex-text-primary">{children}</body>
    </html>
  );
}
