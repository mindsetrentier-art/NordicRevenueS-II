import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Scan, CheckCircle, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface ScanResult {
  category: 'cogs' | 'utilities' | 'rent' | 'taxes' | 'otherCosts';
  totalHT: number;
  vat: number;
  totalTTC: number;
}

interface InvoiceScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onClose: () => void;
}

export function InvoiceScanner({ onScanComplete, onClose }: InvoiceScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Veuillez sélectionner une image (JPG, PNG) ou un PDF.');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      // Create preview
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      }

      // Convert file to base64
      const base64Data = await getBase64(file);
      const mimeType = file.type;

      // Extract details using Gemini
      await extractInvoiceData(base64Data, mimeType);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'analyse de la facture.");
      setIsScanning(false);
    }
  };

  const extractInvoiceData = async (base64Data: string, mimeType: string) => {
    try {
      // In Vite, we should use import.meta.env for client-side API keys, but the instruction from the system skill says:
      // React (Vite): const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // BUT, in a Vite client app without 'process', process.env doesn't work out of the box unless it's defined. Wait, if it's imported this way, it might be. Wait, AI Studio environment says:
      // "Always use process.env.GEMINI_API_KEY for the Gemini API." Wait, I shouldn't use import.meta.env for GEMINI_API_KEY!
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            "Extrait les informations financières de cette facture. Classe la dépense dans l'une de ces catégories : 'cogs' (matières premières, fournitures pour restaurants comme Metro, Transgourmet, etc.), 'utilities' (électricité, gaz, eau), 'rent' (loyer), 'taxes' (impôts, taxes diverses), 'otherCosts' (autres dépenses). Retourne uniquement les montants sous format numérique (ex: 15.50)."
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "La catégorie de la dépense. Doit être l'exacte valeur 'cogs', 'utilities', 'rent', 'taxes', ou 'otherCosts'.",
              },
              totalHT: {
                type: Type.NUMBER,
                description: "Le montant total Hors Taxes (HT).",
              },
              vat: {
                type: Type.NUMBER,
                description: "Le montant de la TVA.",
              },
              totalTTC: {
                type: Type.NUMBER,
                description: "Le montant total Toutes Taxes Comprises (TTC).",
              }
            },
            required: ['category', 'totalHT', 'vat', 'totalTTC']
          }
        }
      });

      if (!response.text) {
        throw new Error("L'IA n'a pas renvoyé de réponse valide.");
      }

      const result: ScanResult = JSON.parse(response.text.trim());
      
      // Cleanup Object URL
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
      }
      
      setIsScanning(false);
      onScanComplete(result);
      
    } catch (err: any) {
      console.error('Error scanning invoice:', err);
      setError("Impossible d'extraire les données. Vérifiez que l'image est nette.");
      setIsScanning(false);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
        if ((encoded.length % 4) > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-indigo-900 font-black">
            <Scan className="text-indigo-600" size={20} />
            Scan de Facture (IA)
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            disabled={isScanning}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {isScanning ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
               {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-xl mb-6 shadow-md opacity-50 grayscale transition-all duration-1000" />
               )}
               <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
               <p className="font-medium text-indigo-900 text-center text-lg animate-pulse">Analyse en cours...</p>
               <p className="text-xs text-slate-400 mt-2 text-center max-w-[200px]">L'Intelligence Artificielle extrait le montant HT, la TVA et classifie la dépense.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-200 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Camera size={28} />
                </div>
                <h3 className="font-black text-indigo-900 mb-1">Prendre en photo</h3>
                <p className="text-xs text-slate-500 text-center font-medium">ou sélectionner une image/PDF</p>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf" 
                className="hidden" 
              />

              <div className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                <p>Vos factures sont analysées par l'Intelligence Artificielle de Google Gemini en quelques secondes.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
