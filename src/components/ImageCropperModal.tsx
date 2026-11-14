import React, { useEffect, useRef, useState } from 'react';
import { ImageCropConfig } from '../types/codex';
import {
  calculateCropDrawParams,
  getAspectDimensions,
} from '../utils/codexLogic';
import { compressImageFileToDataUrl } from '../utils/imageCompression';
import { createProceduralSourceImage } from '../../tools/backgroundGenerator';
import {
  Crop,
  Maximize2,
  Move,
  RotateCcw,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  initialRawImage?: string;
  initialConfig?: ImageCropConfig;
  defaultAspect?: ImageCropConfig['aspectRatio'];
  entityName?: string;
  onApply: (
    croppedDataUrl: string,
    rawDataUrl: string,
    config: ImageCropConfig
  ) => void;
  onClose: () => void;
}

const ASPECT_OPTIONS: Array<{
  value: ImageCropConfig['aspectRatio'];
  label: string;
}> = [
  { value: '3:4', label: '3:4 Portrait' },
  { value: '2:3', label: '2:3 Full Body' },
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Banner' },
];

const RESOLUTION_OPTIONS = [
  { width: 450, label: 'Compact (450w)' },
  { width: 600, label: 'Standard (600w)' },
  { width: 900, label: 'High-Res (900w)' },
];

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  initialRawImage,
  initialConfig,
  defaultAspect = '3:4',
  entityName = '',
  onApply,
  onClose,
}) => {
  const defaultDims = getAspectDimensions(defaultAspect, 600);
  const [rawImageUrl, setRawImageUrl] = useState<string>(initialRawImage || '');
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [baseWidth, setBaseWidth] = useState<number>(
    initialConfig?.outputWidth || defaultDims.width
  );
  const [aspectRatio, setAspectRatio] = useState<
    ImageCropConfig['aspectRatio']
  >(initialConfig?.aspectRatio || defaultAspect);
  const [scale, setScale] = useState<number>(initialConfig?.scale ?? 1);
  const [offsetX, setOffsetX] = useState<number>(initialConfig?.offsetX ?? 0);
  const [offsetY, setOffsetY] = useState<number>(initialConfig?.offsetY ?? 0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRawImageUrl(initialRawImage || '');
      setAspectRatio(initialConfig?.aspectRatio || defaultAspect);
      setBaseWidth(initialConfig?.outputWidth || 600);
      setScale(initialConfig?.scale ?? 1);
      setOffsetX(initialConfig?.offsetX ?? 0);
      setOffsetY(initialConfig?.offsetY ?? 0);
    }
  }, [isOpen, initialRawImage, initialConfig, defaultAspect]);

  useEffect(() => {
    if (!rawImageUrl) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setLoadedImage(img);
    };
    img.src = rawImageUrl;
  }, [rawImageUrl]);

  const targetDims = getAspectDimensions(aspectRatio, baseWidth);

  // Render live cropped & resized preview onto the canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.width = targetDims.width;
    canvas.height = targetDims.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark checkerboard backdrop
    ctx.fillStyle = '#090D14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = 24;
    ctx.fillStyle = '#131720';
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    if (loadedImage) {
      const drawParams = calculateCropDrawParams(
        loadedImage.naturalWidth || loadedImage.width,
        loadedImage.naturalHeight || loadedImage.height,
        {
          scale,
          offsetX,
          offsetY,
          aspectRatio,
          outputWidth: targetDims.width,
          outputHeight: targetDims.height,
        }
      );

      ctx.drawImage(
        loadedImage,
        drawParams.dx,
        drawParams.dy,
        drawParams.dWidth,
        drawParams.dHeight
      );
    }

    // Rule-of-thirds crop guide overlay (visual only on screen, excluded on export)
    if (showGrid && loadedImage) {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.45)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        const x = (canvas.width / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        const y = (canvas.height / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    }
  }, [loadedImage, scale, offsetX, offsetY, aspectRatio, targetDims.width, targetDims.height, showGrid]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void compressImageFileToDataUrl(file, 1440, 0.84).then((compressedUrl) => {
      setRawImageUrl(compressedUrl);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    });
  };

  const handleGenerateSamplePortrait = () => {
    const generated = createProceduralSourceImage(entityName || 'Portrait');
    setRawImageUrl(generated);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loadedImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current || !previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const ratioX = targetDims.width / Math.max(1, rect.width);
    const ratioY = targetDims.height / Math.max(1, rect.height);

    const deltaX = (e.clientX - dragStartRef.current.clientX) * ratioX;
    const deltaY = (e.clientY - dragStartRef.current.clientY) * ratioY;

    setOffsetX(Math.round(dragStartRef.current.startOffsetX + deltaX));
    setOffsetY(Math.round(dragStartRef.current.startOffsetY + deltaY));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleResetTransform = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleExportAndApply = () => {
    if (!loadedImage) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetDims.width;
    exportCanvas.height = targetDims.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090D14';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    const config: ImageCropConfig = {
      scale,
      offsetX,
      offsetY,
      aspectRatio,
      outputWidth: targetDims.width,
      outputHeight: targetDims.height,
    };

    const drawParams = calculateCropDrawParams(
      loadedImage.naturalWidth || loadedImage.width,
      loadedImage.naturalHeight || loadedImage.height,
      config
    );

    ctx.drawImage(
      loadedImage,
      drawParams.dx,
      drawParams.dy,
      drawParams.dWidth,
      drawParams.dHeight
    );

    const finalDataUrl = exportCanvas.toDataURL('image/jpeg', 0.84);
    onApply(finalDataUrl, finalDataUrl, config);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-cropper-title"
    >
      <div className="w-full max-w-4xl border border-[#2C3B52] bg-[#111722] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#233044] px-6 py-4">
          <div className="flex items-center gap-3">
            <Crop className="h-5 w-5 text-[#2DD4BF]" />
            <h2
              id="image-cropper-title"
              className="font-display text-lg font-semibold text-[#F3F4F6]"
            >
              Portrait &amp; Image Framing Studio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image studio"
            className="p-1.5 text-[#9CA3AF] hover:bg-[#1C212B] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Interactive Crop & Pan Viewport */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#233044] bg-[#090D14] p-6 min-h-[420px]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload local image file"
            />

            {!loadedImage ? (
              <div className="w-full max-w-md border border-dashed border-[#2C3B52] bg-[#111722] p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-[#2DD4BF] mb-3" />
                <h3 className="font-display text-base font-semibold text-[#F3F4F6]">
                  Select Local Image File
                </h3>
                <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed">
                  Upload any PNG, JPG, or WEBP portrait from your device to
                  move, resize, and crop it to your desired frame.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#2DD4BF] px-4 py-2 text-xs font-semibold text-[#090D14] hover:bg-[#5EEAD4] transition-colors whitespace-nowrap shrink-0"
                  >
                    Browse Device Files
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateSamplePortrait}
                    className="flex items-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-4 py-2 text-xs font-medium text-[#E5E7EB] hover:bg-[#1F2430] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    Generate Emblem Canvas
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="relative flex items-center justify-center max-h-[380px] w-full overflow-hidden">
                  <canvas
                    ref={previewCanvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="max-h-[360px] max-w-full border border-[#2C3B52] cursor-move touch-none shadow-lg"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between w-full text-xs text-[#9CA3AF]">
                  <span className="flex items-center gap-1.5">
                    <Move className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    Drag image directly on canvas to pan
                  </span>
                  <span className="font-mono-tabular">
                    Output: {targetDims.width} × {targetDims.height} px
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Move, Resize & Crop Controls */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 space-y-5">
            <div className="space-y-5">
              {/* Source Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 border border-[#2C3B52] bg-[#162030] px-3 py-2 text-xs font-medium text-[#F3F4F6] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  Upload Local Image
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSamplePortrait}
                  className="flex items-center justify-center gap-1.5 border border-[#2C3B52] bg-[#162030] px-3 py-2 text-xs font-medium text-[#D1D5DB] hover:border-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
                  title="Create procedural emblem canvas for testing or placeholder"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  Emblem Canvas
                </button>
              </div>

              {/* 1. Crop Aspect Ratio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    1. Crop Aspect Ratio
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGrid((prev) => !prev)}
                    className="text-[11px] text-[#9CA3AF] hover:text-[#2DD4BF] transition-colors"
                  >
                    {showGrid ? 'Hide Grid' : 'Show Grid'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ASPECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAspectRatio(opt.value)}
                      className={`px-3 py-2 text-xs font-medium border text-left transition-colors whitespace-nowrap shrink-0 ${
                        aspectRatio === opt.value
                          ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-[#F3F4F6]'
                          : 'border-[#233044] bg-[#090D14] text-[#9CA3AF] hover:text-[#E5E7EB]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Resize / Zoom Scale */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="crop-scale-slider"
                    className="text-xs font-semibold text-[#E5E7EB]"
                  >
                    2. Resize &amp; Scale Zoom
                  </label>
                  <span className="font-mono-tabular text-xs text-[#2DD4BF]">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() =>
                      setScale((s) => Math.max(0.2, Math.round((s - 0.1) * 100) / 100))
                    }
                    className="border border-[#2C3B52] bg-[#090D14] p-1.5 text-[#9CA3AF] hover:text-white"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <input
                    id="crop-scale-slider"
                    type="range"
                    min="0.2"
                    max="4.0"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-[#2DD4BF]"
                  />
                  <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() =>
                      setScale((s) => Math.min(4.0, Math.round((s + 0.1) * 100) / 100))
                    }
                    className="border border-[#2C3B52] bg-[#090D14] p-1.5 text-[#9CA3AF] hover:text-white"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Move / Pan Offsets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#E5E7EB]">
                    3. Move / Position Offset
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTransform}
                    className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-[#2DD4BF] transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Center
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1">
                    <label htmlFor="crop-offset-x">Horizontal Pan (X)</label>
                    <span className="font-mono-tabular">{offsetX} px</span>
                  </div>
                  <input
                    id="crop-offset-x"
                    type="range"
                    min="-450"
                    max="450"
                    step="1"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                    className="w-full accent-[#2DD4BF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1">
                    <label htmlFor="crop-offset-y">Vertical Pan (Y)</label>
                    <span className="font-mono-tabular">{offsetY} px</span>
                  </div>
                  <input
                    id="crop-offset-y"
                    type="range"
                    min="-450"
                    max="450"
                    step="1"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                    className="w-full accent-[#2DD4BF]"
                  />
                </div>
              </div>

              {/* 4. Output Resolution */}
              <div>
                <label className="block text-xs font-semibold text-[#E5E7EB] mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    4. Target Output Resolution
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {RESOLUTION_OPTIONS.map((res) => (
                    <button
                      key={res.width}
                      type="button"
                      onClick={() => setBaseWidth(res.width)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        baseWidth === res.width
                          ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-[#F3F4F6]'
                          : 'border-[#233044] bg-[#090D14] text-[#9CA3AF] hover:text-[#E5E7EB]'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[#233044] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border border-[#2C3B52] bg-[#162030] px-4 py-2 text-xs font-medium text-[#D1D5DB] hover:bg-[#1F2430] transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!loadedImage}
                onClick={handleExportAndApply}
                className="bg-[#2DD4BF] px-5 py-2 text-xs font-semibold text-[#090D14] hover:bg-[#5EEAD4] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
              >
                Apply Cropped Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
