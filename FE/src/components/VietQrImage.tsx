import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  /** Ready-made image from img.vietqr.io (has the bank logo and amount printed on it). */
  remoteUrl: string;
  bankBin: string;
  accountNumber: string;
  amount: number;
  addInfo: string;
  alt: string;
  className?: string;
}

/** One EMVCo TLV field: id, two-digit length, value. */
const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE, the checksum EMVCo QR payloads end with. */
const crc16 = (data: string) => {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/** NAPAS VietQR payload for a transfer of `amount` VND to a bank account, scannable by banking apps. */
export const buildVietQrPayload = (bankBin: string, accountNumber: string, amount: number, addInfo: string) => {
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bankBin) + tlv('01', accountNumber)) + tlv('02', 'QRIBFTTA');
  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('38', merchant) +
    tlv('53', '704') +
    (amount > 0 ? tlv('54', String(Math.round(amount))) : '') +
    tlv('58', 'VN') +
    (addInfo ? tlv('62', tlv('08', addInfo.slice(0, 50))) : '') +
    '6304';
  return body + crc16(body);
};

/**
 * VietQR image that still works offline: it shows the img.vietqr.io picture, and if that host
 * cannot be reached (venue Wi-Fi, firewall) it draws the same VietQR payload locally instead of
 * leaving an empty frame where the customer is supposed to scan.
 */
const VietQrImage: React.FC<Props> = ({ remoteUrl, bankBin, accountNumber, amount, addInfo, alt, className }) => {
  const [src, setSrc] = useState(remoteUrl);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    setSrc(remoteUrl);
    setUsingFallback(false);
  }, [remoteUrl]);

  const handleError = () => {
    if (usingFallback) return;
    setUsingFallback(true);
    QRCode.toDataURL(buildVietQrPayload(bankBin, accountNumber, amount, addInfo), { width: 320, margin: 1 })
      .then(setSrc)
      .catch(() => setSrc(''));
  };

  return <img src={src} alt={alt} className={className} onError={handleError} />;
};

export default VietQrImage;
