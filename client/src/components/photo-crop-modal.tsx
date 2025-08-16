import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedImageUrl: string) => void;
}

export default function PhotoCropModal({ 
  isOpen, 
  onClose, 
  imageFile, 
  onCropComplete 
}: PhotoCropModalProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 200 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleImageLoad = useCallback(() => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !container) return;

    const maxContainerSize = 400;
    const cropSize = 200;
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    
    let displayWidth, displayHeight;
    
    // Garantir que a imagem sempre seja grande o suficiente para o crop
    const minSize = cropSize + 40; // Padding extra para facilitar o posicionamento
    
    if (imageAspectRatio > 1) {
      // Imagem mais larga
      displayWidth = Math.max(minSize, Math.min(maxContainerSize, maxContainerSize));
      displayHeight = displayWidth / imageAspectRatio;
      
      // Se a altura ficou menor que o mínimo, ajustar pela altura
      if (displayHeight < minSize) {
        displayHeight = minSize;
        displayWidth = displayHeight * imageAspectRatio;
      }
    } else {
      // Imagem mais alta
      displayHeight = Math.max(minSize, Math.min(maxContainerSize, maxContainerSize));
      displayWidth = displayHeight * imageAspectRatio;
      
      // Se a largura ficou menor que o mínimo, ajustar pela largura
      if (displayWidth < minSize) {
        displayWidth = minSize;
        displayHeight = displayWidth / imageAspectRatio;
      }
    }

    setImageSize({ width: displayWidth, height: displayHeight });
    setScale(Math.min(displayWidth, displayHeight) / Math.min(image.naturalWidth, image.naturalHeight));
    
    // Center the crop area
    setCropArea({
      x: Math.max(0, (displayWidth - cropSize) / 2),
      y: Math.max(0, (displayHeight - cropSize) / 2),
      size: cropSize
    });
  }, []);

  const handleCropAreaMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - cropArea.size / 2;
    const y = e.clientY - rect.top - cropArea.size / 2;

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(x, imageSize.width - prev.size)),
      y: Math.max(0, Math.min(y, imageSize.height - prev.size))
    }));
  };

  const cropToSquare = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Definir tamanho do canvas (quadrado de 200x200)
    const outputSize = 200;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calcular coordenadas da imagem original baseado na área de crop
    const scaleToOriginal = 1 / scale;
    const sourceX = cropArea.x * scaleToOriginal;
    const sourceY = cropArea.y * scaleToOriginal;
    const sourceSize = cropArea.size * scaleToOriginal;

    // Limpar canvas com fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);
    
    // Desenhar a imagem cortada no canvas
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, outputSize, outputSize
    );

    // Converter canvas para blob e criar URL
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedUrl = URL.createObjectURL(blob);
        onCropComplete(croppedUrl);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleCancel = () => {
    onClose();
  };

  if (!imageFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajustar Foto do Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Arraste o círculo para posicionar sua foto. A área dentro do círculo será sua foto de perfil.
            </p>
            
            {imageFile && imageUrl && (
              <div className="relative mx-auto" style={{ width: 'fit-content' }}>
                <div 
                  ref={containerRef}
                  className="relative overflow-hidden rounded-lg border-2 border-gray-300"
                  style={{ 
                    width: `${imageSize.width}px`, 
                    height: `${imageSize.height}px`,
                    cursor: 'crosshair'
                  }}
                  onClick={handleCropAreaMove}
                >
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    style={{ 
                      width: `${imageSize.width}px`, 
                      height: `${imageSize.height}px` 
                    }}
                    onLoad={handleImageLoad}
                    draggable={false}
                  />
                  
                  {/* Dark overlay with circular cutout */}
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-50"
                    style={{
                      clipPath: `polygon(0% 0%, 0% 100%, ${cropArea.x}px 100%, ${cropArea.x}px ${cropArea.y}px, ${cropArea.x + cropArea.size}px ${cropArea.y}px, ${cropArea.x + cropArea.size}px ${cropArea.y + cropArea.size}px, ${cropArea.x}px ${cropArea.y + cropArea.size}px, ${cropArea.x}px 100%, 100% 100%, 100% 0%)`
                    }}
                  />
                  
                  {/* Crop area */}
                  <div
                    className="absolute border-4 border-primary rounded-full bg-transparent"
                    style={{
                      left: `${cropArea.x}px`,
                      top: `${cropArea.y}px`,
                      width: `${cropArea.size}px`,
                      height: `${cropArea.size}px`,
                      cursor: 'move',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      
                      const startX = e.clientX - rect.left - cropArea.x;
                      const startY = e.clientY - rect.top - cropArea.y;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const newX = e.clientX - rect.left - startX;
                        const newY = e.clientY - rect.top - startY;
                        
                        setCropArea(prev => ({
                          ...prev,
                          x: Math.max(0, Math.min(newX, imageSize.width - prev.size)),
                          y: Math.max(0, Math.min(newY, imageSize.height - prev.size))
                        }));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    <div className="w-full h-full border-2 border-dashed border-white opacity-80 rounded-full"></div>
                    
                    {/* Center indicator */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full opacity-70"></div>
                  </div>
                </div>
                
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={cropToSquare} className="bg-primary hover:bg-green-600">
              Usar Foto Recortada
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}