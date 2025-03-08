import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'Video Upload App',
  description: 'Upload and process videos with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}