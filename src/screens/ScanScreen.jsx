import { useState, useRef, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Button } from "../components/ui/Button";
import {
  Camera,
  Image as ImageIcon,
  ScanLine,
  Loader2,
  ArrowLeft,
  Upload,
  ZoomIn,
  RotateCw,
  Check,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const SUPPORTED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);
const NON_CONVERTIBLE_EXTENSIONS = new Set(["heic", "heif"]);

const getExtension = (name = "") => {
  const parts = String(name).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
};

const isSupportedImage = (file) => {
  const ext = getExtension(file?.name || "");
  const hasValidMime = file?.type
    ? SUPPORTED_MIME_TYPES.has(file.type.toLowerCase())
    : false;
  const hasValidExt = SUPPORTED_EXTENSIONS.has(ext);
  return hasValidMime || hasValidExt;
};

const isHeicOrHeif = (file) => {
  const ext = getExtension(file?.name || "");
  const type = String(file?.type || "").toLowerCase();
  return (
    NON_CONVERTIBLE_EXTENSIONS.has(ext) ||
    type === "image/heic" ||
    type === "image/heif"
  );
};

const readExifOrientation = (buffer) => {
  const view = new DataView(buffer);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    const segLen = view.getUint16(offset + 2, false);
    if (marker === 0xffe1) {
      if (view.getUint32(offset + 4, false) !== 0x45786966) return 1;
      const little = view.getUint16(offset + 10, false) === 0x4949;
      const tagCount = view.getUint16(offset + 14, little);
      for (let i = 0; i < tagCount; i++) {
        const tagOffset = offset + 16 + i * 12;
        if (tagOffset + 10 > view.byteLength) break;
        if (view.getUint16(tagOffset, little) === 0x0112) {
          return view.getUint16(tagOffset + 8, little);
        }
      }
      return 1;
    }
    offset += 2 + segLen;
  }
  return 1;
};

const correctImageOrientation = (file) =>
  new Promise((resolve, reject) => {
    const arrayReader = new FileReader();
    arrayReader.onerror = (error) => {
      console.error("DEBUG: FileReader Error:", error);
      reject(error);
    };
    arrayReader.onload = (e) => {
      const orientation = readExifOrientation(e.target.result);
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = (error) => {
        console.error("DEBUG: FileReader Error:", error);
        URL.revokeObjectURL(blobUrl);
        reject(error);
      };
      img.onload = () => {
        const swapped = orientation >= 5 && orientation <= 8;
        const naturalW = swapped ? img.height : img.width;
        const naturalH = swapped ? img.width : img.height;
        const canvas = document.createElement("canvas");
        canvas.width = naturalW;
        canvas.height = naturalH;
        const ctx = canvas.getContext("2d");
        switch (orientation) {
          case 2:
            ctx.transform(-1, 0, 0, 1, img.width, 0);
            break;
          case 3:
            ctx.transform(-1, 0, 0, -1, img.width, img.height);
            break;
          case 4:
            ctx.transform(1, 0, 0, -1, 0, img.height);
            break;
          case 5:
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
          case 6:
            ctx.transform(0, 1, -1, 0, img.height, 0);
            break;
          case 7:
            ctx.transform(0, -1, -1, 0, img.height, img.width);
            break;
          case 8:
            ctx.transform(0, -1, 1, 0, 0, img.width);
            break;
          default:
            break;
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobUrl);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.92),
          width: naturalW,
          height: naturalH,
        });
      };
      img.src = blobUrl;
    };
    arrayReader.readAsArrayBuffer(file);
  });

export const ScanScreen = ({ onOpenTerms, onOpenPrivacy }) => {
  const { setScreen, setUploadedImage } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [fileError, setFileError] = useState("");
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [isAgreed, setIsAgreed] = useState(false);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const scanTimerRef = useRef(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileError("");
    if (!isSupportedImage(file)) {
      setFileError("Unsupported format. Please upload JPG, PNG, or WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large. Maximum size is 10MB.");
      e.target.value = "";
      return;
    }
    if (isHeicOrHeif(file)) {
      setFileError(
        "HEIC/HEIF is not fully supported here. Please convert to JPG or PNG and try again.",
      );
      e.target.value = "";
      return;
    }
    try {
      const { dataUrl, width, height } = await correctImageOrientation(file);
      setAspectRatio(height > width ? 9 / 16 : 16 / 9);
      setPreview(dataUrl);
      setShowCropper(true);
    } catch (error) {
      console.error("DEBUG: FileReader Error:", error);
      setFileError(
        "Could not read this image file. Please use a clear JPG, PNG, or WEBP image.",
      );
      e.target.value = "";
    }
  };

  const triggerCamera = () => cameraInputRef.current?.click();
  const triggerUpload = () => uploadInputRef.current?.click();
  const handleTouchCamera = (e) => {
    e.preventDefault();
    triggerCamera();
  };
  const handleTouchUpload = (e) => {
    e.preventDefault();
    triggerUpload();
  };

  const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);
    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5,
    );

    const data = ctx.getImageData(
      safeArea / 2 - image.width * 0.5 + pixelCrop.x,
      safeArea / 2 - image.height * 0.5 + pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
    );

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((file) => {
        resolve(URL.createObjectURL(file));
      }, "image/jpeg");
    });
  };

  const confirmCrop = async () => {
    try {
      const croppedImage = await getCroppedImg(
        preview,
        croppedAreaPixels,
        rotation,
      );
      setUploadedImage(croppedImage);
      setShowCropper(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScan = () => {
    if (!isAgreed) return;
    setIsScanning(true);
    scanTimerRef.current = setTimeout(() => {
      setScreen("themes");
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between pt-4 pb-2 px-4 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <button
          onClick={() => setScreen("welcome")}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-xl font-display font-bold">Transform your space</h2>
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
              aspect={aspectRatio}
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
              <p className="text-gray-400 text-sm">
                Upload a clear photo of your desk
              </p>
              <p className="text-gray-500 text-xs">
                to start designing your dream room.
              </p>
              {fileError && (
                <p className="text-red-400 text-xs font-semibold mt-1">
                  {fileError}
                </p>
              )}
            </div>

            <div className="w-full aspect-[4/5] bg-black/40 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border border-dashed border-white/20">
              {!preview ? (
                <div
                  onClick={triggerUpload}
                  onTouchEnd={handleTouchUpload}
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10 transition-all duration-300">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-300 font-medium">Tap to upload image</p>
                </div>
              ) : (
                <div className="w-full relative flex justify-center bg-gray-900/50">
                  <img
                    src={preview}
                    alt="Setup Preview"
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
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
              <button
                type="button"
                onClick={triggerCamera}
                onTouchEnd={handleTouchCamera}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-white/20 transition-colors w-full"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>
              <button
                type="button"
                onClick={triggerUpload}
                onTouchEnd={handleTouchUpload}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-white/20 transition-colors w-full"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Upload Image</span>
              </button>
            </div>

            <div className="flex items-start gap-2 mb-4 px-1">
              <input
                type="checkbox"
                id="terms"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50"
              />
              <label
                htmlFor="terms"
                className="text-[11px] text-gray-400 leading-tight"
              >
                I agree to the{" "}
                <button
                  onClick={onOpenTerms}
                  className="text-primary hover:underline"
                >
                  Terms of Use
                </button>{" "}
                and{" "}
                <button
                  onClick={onOpenPrivacy}
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </button>
                .
              </label>
            </div>

            <Button
              variant="primary"
              onClick={handleScan}
              disabled={!preview || isScanning || !isAgreed}
              className={`w-full shadow-lg ${!preview || isScanning || !isAgreed ? "opacity-50 grayscale cursor-not-allowed" : "shadow-primary/20"}`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Building your design...
                </>
              ) : (
                <>
                  <ScanLine className="w-5 h-5" />
                  Start Designing
                </>
              )}
            </Button>
          </div>
        </>
      )}

      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp,.heic,.heif"
        className="hidden"
      />

    </div>
  );
};
