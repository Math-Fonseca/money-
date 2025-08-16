import { useState, useRef, useCallback } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
    }
  }, [imageFile]);

  const cropToSquare = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Definir tamanho do canvas (quadrado de 200x200)
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Calcular as dimensões para crop centralizado
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    let sourceX, sourceY, sourceWidth, sourceHeight;

    if (imageAspectRatio > 1) {
      // Imagem é mais larga que alta
      sourceHeight = image.naturalHeight;
      sourceWidth = sourceHeight; // Fazer quadrado
      sourceX = (image.naturalWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      // Imagem é mais alta que larga
      sourceWidth = image.naturalWidth;
      sourceHeight = sourceWidth; // Fazer quadrado
      sourceX = 0;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    // Limpar canvas com fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Desenhar a imagem cortada no canvas
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, size, size
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
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
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
              Sua foto será ajustada automaticamente para ficar quadrada e sem distorção.
            </p>
            
            {imageFile && (
              <>
                <img
                  ref={imageRef}
                  src={imageUrl || URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                  onLoad={handleImageLoad}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={cropToSquare} className="bg-primary hover:bg-green-600">
              Ajustar e Usar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}