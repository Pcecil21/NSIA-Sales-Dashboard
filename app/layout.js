import "./globals.css";

export const metadata = {
  title: "NSIA Sales Dashboard",
  description: "North Shore Ice Arena — LED Scoreboard & Digital Media Advertising Sales Tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-navy text-gray-200 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
