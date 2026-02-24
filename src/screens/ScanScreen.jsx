/* eslint-disable react/prop-types */
import { useState, useRef, useCallback } from "react";
import Cropper from 'react-easy-crop';
import { Button } from "../components/ui/Button";
import { Camera, Image as ImageIcon, ScanLine, Loader2, ArrowLeft, Upload, ZoomIn, RotateCw, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { calculateScore } from "../utils/logicEngine";

export const ScanScreen = () => {
    const { setScreen, setUploadedImage, setAnalysisResult } = useApp();
    const [isScanning, setIsScanning] = useState(false);
    const [preview, setPreview] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    const fileInputRef = useRef(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => { image.onload = resolve; });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        canvas.width = safeArea;
        canvas.height = safeArea;

        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-safeArea / 2, -safeArea / 2);
        ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);

        const data = ctx.getImageData(
            safeArea / 2 - image.width * 0.5 + pixelCrop.x,
            safeArea / 2 - image.height * 0.5 + pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height
        );

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        ctx.putImageData(data, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((file) => { resolve(URL.createObjectURL(file)); }, 'image/jpeg');
        });
    };

    const confirmCrop = async () => {
        try {
            const croppedImage = await getCroppedImg(preview, croppedAreaPixels, rotation);
            setUploadedImage(croppedImage);
            setShowCropper(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            const mockName = "setup_" + Date.now();
            const result = calculateScore(mockName);
            setAnalysisResult(result);
            setScreen('analysis');
        }, 2000);
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
            <header className="flex items-center justify-between pt-4 pb-2 px-4 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-sm">
                <button onClick={() => setScreen('welcome')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h2 className="text-xl font-display font-bold">Scan Your Station</h2>
                <div className="w-9" />
            </header>

            {showCropper ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="relative flex-1 w-full bg-black">
                        <Cropper
                            image={preview}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                        />
                    </div>
                    <div className="p-4 bg-surface/90 backdrop-blur-md border-t border-white/10 space-y-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <ZoomIn className="w-4 h-4 text-gray-400" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(e.target.value)}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <Button variant="primary" onClick={confirmCrop} className="w-full">
                            <Check className="w-5 h-5" />
                            Done Adjusting
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-6 gap-4 overflow-hidden">
                        <div className="text-center space-y-1">
                            <p className="text-gray-400 text-sm">Upload a clear photo of your desk</p>
                            <p className="text-gray-500 text-xs">to generate your aesthetic score.</p>
                        </div>

                        <div className="w-full aspect-[4/5] bg-black/40 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group border border-dashed border-white/20 transition-colors hover:border-primary/30">
                            {!preview ? (
                                <div
                                    onClick={triggerFileInput}
                                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300">
                                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <p className="text-gray-300 font-medium">Tap to upload image</p>
                                </div>
                            ) : (
                                <div className="w-full relative flex justify-center bg-gray-900/50">
                                    <img src={preview} alt="Setup Preview" className="w-full h-auto max-h-[60vh] object-contain" />
                                    <button
                                        onClick={() => setShowCropper(true)}
                                        className="absolute bottom-4 right-4 z-30 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
                                    >
                                        <RotateCw className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full max-w-md mx-auto pb-10 pt-4 px-6 shrink-0">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <Button variant="outline" size="sm" onClick={triggerFileInput}>
                                <Camera className="w-4 h-4" />
                                Take Photo
                            </Button>
                            <Button variant="outline" size="sm" onClick={triggerFileInput}>
                                <ImageIcon className="w-4 h-4" />
                                Gallery
                            </Button>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleScan}
                            disabled={!preview || isScanning}
                            className={`w-full shadow-lg ${(!preview && !isScanning) ? "opacity-50 grayscale" : "shadow-primary/20"}`}
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <ScanLine className="w-5 h-5" />
                                    Analyze Setup
                                </>
                            )}
                        </Button>
                    </div>
                </>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        </div>
    );
};
