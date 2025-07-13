import React, { useRef, useEffect, useState } from 'react';
import { XCircleIcon, LoaderIcon } from './icons/Icons';

interface QRScannerModalProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

// Type definition for BarcodeDetector API
declare global {
    interface Window {
        BarcodeDetector: new (options?: { formats: string[] }) => any;
    }
}
interface DetectedBarcode {
    rawValue: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let animationFrameId: number | null = null;

        const scan = async (detector: any) => {
            if (videoRef.current && videoRef.current.readyState > 1) {
                try {
                    const barcodes: DetectedBarcode[] = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        onScan(barcodes[0].rawValue);
                        return; // Stop scanning
                    }
                } catch (e) {
                    console.error("Barcode detection failed:", e);
                }
            }
            animationFrameId = requestAnimationFrame(() => scan(detector));
        };

        const initScanner = async () => {
            if (!('BarcodeDetector' in window)) {
                setError('Barcode Detector API is not supported in this browser.');
                setIsLoading(false);
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setIsLoading(false);
                    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                    scan(detector);
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if ((err as Error).name === 'NotAllowedError') {
                    setError('Permission to use camera was denied. Please allow camera access in your browser settings.');
                } else {
                    setError('Could not access the camera. Please ensure it is not in use by another application.');
                }
                setIsLoading(false);
            }
        };
        
        initScanner();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white p-4 rounded-xl shadow-2xl w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-2 right-2 p-1 bg-white bg-opacity-70 rounded-full hover:bg-opacity-100 z-10" aria-label="Close scanner">
                    <XCircleIcon className="w-8 h-8 text-gray-700" />
                </button>
                <h2 className="text-xl font-bold mb-4 text-center">Scan QR Code</h2>
                <div className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline title="QR Code Scanner Camera View" />
                    {isLoading && <div className="absolute inset-0 flex flex-col justify-center items-center bg-black bg-opacity-50"><LoaderIcon className="w-12 h-12 text-white" /><p className="text-white mt-2">Starting camera...</p></div>}
                    {error && <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4"><p className="text-white text-center">{error}</p></div>}
                    <div className="absolute inset-0 border-8 border-white border-opacity-25 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 0% 25%, 25% 25%, 25% 0%, 100% 0%, 100% 25%, 75% 25%, 75% 0, 75% 0, 75% 75%, 100% 75%, 100% 100%, 75% 100%, 75% 75%, 25% 75%, 25% 100%, 0 100%)' }}></div>
                </div>
            </div>
        </div>
    );
};
