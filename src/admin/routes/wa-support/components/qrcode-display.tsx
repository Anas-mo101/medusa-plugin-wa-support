import { useEffect, useState } from "react";
import QRCode from "qrcode";

const QRCodeDisplay = ({ qrString }: { qrString: string }) => {
  const [qrImageUrl, setQrImageUrl] = useState<string>("");

  useEffect(() => {
    if (qrString) {
      QRCode.toDataURL(qrString, {
        width: 256,
        margin: 1, // Keep the white border minimal to fit your UI design
        color: {
          dark: "#111827", // Tailwind gray-900 for a softer black
          light: "#FFFFFF" 
        }
      })
      .then((url) => setQrImageUrl(url))
      .catch((err) => console.error("QR Code generation failed", err));
    }
  }, [qrString]);

  if (!qrImageUrl) {
    return (
      <div className="w-48 h-48 flex items-center justify-center bg-ui-bg-subtle animate-pulse rounded-md" />
    );
  }

  return (
    <img 
      src={qrImageUrl} 
      alt="WhatsApp Session QR Code" 
      className="w-48 h-48 object-contain rounded-md" 
    />
  );
};

export default QRCodeDisplay;